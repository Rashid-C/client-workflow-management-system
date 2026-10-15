import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { ClientsService, type ClientDetail } from '../clients/clients.service.js';
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import {
  type FollowUpDto,
  type LeadQueryDto,
  type LeadStatus,
  type SaveLeadDto,
  type UpdateLeadDto,
} from './dto.js';

const TIME_ZONE = process.env['APP_TIME_ZONE'] ?? 'Asia/Dubai';
const TODAY = `(now() AT TIME ZONE '${TIME_ZONE}')::date`;

type PersonRef = { id: number; name: string };

export interface Lead {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  services: string[];
  estimatedValue: number | null;
  status: LeadStatus;
  owner: PersonRef | null;
  nextFollowUpDate: string | null;
  /** The planned follow-up is today or overdue on an open lead. */
  followUpDue: boolean;
  lostReason: string | null;
  notes: string | null;
  client: { id: number; name: string; clientCode: string } | null;
  createdBy: PersonRef;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface FollowUp {
  id: number;
  kind: string;
  note: string;
  happenedOn: string;
  createdBy: PersonRef;
  createdAt: Date;
}

export type LeadDetail = Lead & { followUps: FollowUp[] };

export interface LeadSummary {
  byStatus: Record<LeadStatus, number>;
  followUpsDue: number;
  /** Estimated value of open leads, in dirhams. */
  openValue: number;
}

const FIELDS = [
  'name',
  'contactName',
  'email',
  'phone',
  'source',
  'services',
  'estimatedValue',
  'status',
  'ownerId',
  'nextFollowUpDate',
  'lostReason',
  'notes',
] as const;
type Field = (typeof FIELDS)[number];
type Values = Record<Field, unknown> & { status: LeadStatus; ownerId: number | null; lostReason: string | null };

const OPEN = `l."status" IN ('New', 'Contacted', 'Proposal sent')`;
const SELECT = `
  SELECT l."id", l."name", l."contactName", l."email", l."phone", l."source",
         COALESCE(l."services", '[]'::jsonb) AS "services", l."estimatedValue", l."status",
         l."nextFollowUpDate", l."lostReason", l."notes", l."version", l."createdAt", l."updatedAt",
         (${OPEN} AND l."nextFollowUpDate" <= ${TODAY}) AS "followUpDue",
         CASE WHEN o."id" IS NULL THEN NULL ELSE json_build_object('id', o."id", 'name', o."name") END AS "owner",
         CASE WHEN c."id" IS NULL THEN NULL
              ELSE json_build_object('id', c."id", 'name', c."name", 'clientCode', c."clientCode") END AS "client",
         json_build_object('id', cb."id", 'name', cb."name") AS "createdBy"
  FROM "Lead" l
  LEFT JOIN "Employee" o ON o."id" = l."ownerId"
  LEFT JOIN "Client" c ON c."id" = l."clientId"
  JOIN "Employee" cb ON cb."id" = l."createdById"`;

/** SQL condition: may the viewer see (or edit) lead `l`? "own" = owned or created by them. */
function leadVisibleTo(viewer: AuthUser, permission: 'leads.view' | 'leads.edit', param: (v: unknown) => string) {
  const scope = viewer.permissions[permission];
  if (scope === 'all') return 'TRUE';
  if (!scope) return 'FALSE';
  const me = param(viewer.employeeId);
  return `(l."ownerId" = ${me} OR l."createdById" = ${me})`;
}

const normalize = (data: SaveLeadDto, status: LeadStatus): Values => ({
  name: data.name,
  contactName: data.contactName ?? null,
  email: data.email?.toLowerCase() ?? null,
  phone: data.phone ?? null,
  source: data.source ?? null,
  services: data.services?.length ? data.services : null,
  estimatedValue: data.estimatedValue ?? null,
  status,
  ownerId: data.ownerId ?? null,
  nextFollowUpDate: data.nextFollowUpDate ?? null,
  // A reason only means something on a lost lead.
  lostReason: status === 'Lost' ? (data.lostReason ?? null) : null,
  notes: data.notes ?? null,
});

const asParam = (field: Field, value: unknown) =>
  field === 'services' && value !== null ? JSON.stringify(value) : value;

@Injectable()
export class LeadsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
    private readonly clients: ClientsService,
  ) {}

  async list(viewer: AuthUser, query: LeadQueryDto): Promise<Lead[]> {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const where = ['l."archivedAt" IS NULL', leadVisibleTo(viewer, 'leads.view', param)];
    if (query.status) where.push(`l."status" = ${param(query.status)}`);
    if (query.due) where.push(`${OPEN} AND l."nextFollowUpDate" <= ${TODAY}`);
    if (query.search?.trim()) {
      const like = param(`%${query.search.trim().replace(/[\\%_]/g, '\\$&')}%`);
      where.push(`(l."name" ILIKE ${like} OR l."contactName" ILIKE ${like} OR l."email" ILIKE ${like} OR l."phone" ILIKE ${like})`);
    }
    const result = await this.pool.query<Lead>(
      `${SELECT} WHERE ${where.join(' AND ')}
       ORDER BY (${OPEN}) DESC, l."nextFollowUpDate" NULLS LAST, l."updatedAt" DESC
       LIMIT 1000`,
      params,
    );
    return result.rows;
  }

  async owners(): Promise<(PersonRef & { designation: string })[]> {
    const result = await this.pool.query<PersonRef & { designation: string }>(
      `SELECT "id", "name", "designation" FROM "Employee" WHERE "status" = 'Active' ORDER BY lower("name")`,
    );
    return result.rows;
  }

  async summary(viewer: AuthUser): Promise<LeadSummary> {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const result = await this.pool.query<{ status: LeadStatus; count: number; due: number; value: number }>(
      `SELECT l."status", count(*)::int AS "count",
              count(*) FILTER (WHERE ${OPEN} AND l."nextFollowUpDate" <= ${TODAY})::int AS "due",
              COALESCE(sum(l."estimatedValue") FILTER (WHERE ${OPEN}), 0)::bigint::float8 AS "value"
       FROM "Lead" l
       WHERE l."archivedAt" IS NULL AND ${leadVisibleTo(viewer, 'leads.view', param)}
       GROUP BY l."status"`,
      params,
    );
    const summary: LeadSummary = {
      byStatus: { New: 0, Contacted: 0, 'Proposal sent': 0, Won: 0, Lost: 0 },
      followUpsDue: 0,
      openValue: 0,
    };
    for (const row of result.rows) {
      summary.byStatus[row.status] = row.count;
      summary.followUpsDue += row.due;
      summary.openValue += row.value;
    }
    return summary;
  }

  async findOne(viewer: AuthUser, id: number): Promise<LeadDetail> {
    await this.assertVisible(this.pool, viewer, id, 'leads.view');
    return (await this.load(this.pool, id))!;
  }

  async create(viewer: AuthUser, data: SaveLeadDto, context: AuditContext): Promise<LeadDetail> {
    const values = normalize(data, data.status ?? 'New');
    checkLost(values);
    return this.transaction(async (db) => {
      const owner = await this.activeOwner(db, values.ownerId);
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "Lead" (${FIELDS.map((f) => `"${f}"`).join(', ')}, "createdById", "updatedAt")
         VALUES (${FIELDS.map((_, i) => `$${i + 1}`).join(', ')}, $${FIELDS.length + 1}, NOW())
         RETURNING "id"`,
        [...FIELDS.map((f) => asParam(f, values[f])), viewer.employeeId],
      );
      const lead = (await this.load(db, inserted.rows[0].id))!;
      const shown: Record<string, unknown> = { ...values, owner };
      delete shown['ownerId'];
      await this.audit.record(db, context, {
        action: 'lead.created',
        entityType: 'Lead',
        entityId: lead.id,
        summary: `Added lead ${lead.name}`,
        changes: Object.fromEntries(Object.entries(shown).filter(([, v]) => v !== null)),
      });
      return lead;
    });
  }

  async update(viewer: AuthUser, id: number, data: UpdateLeadDto, context: AuditContext): Promise<LeadDetail> {
    return this.transaction(async (db) => {
      await this.assertVisible(db, viewer, id, 'leads.edit');
      const current = (await this.lockLead(db, id))!;
      if (current.version !== data.version) {
        throw new ConflictException(
          problem('leads.stale', 'Someone else changed this lead. Reload it and make your changes again.'),
        );
      }
      const next = normalize(data, data.status ?? current.status);
      if (current.client && next.status !== 'Won') {
        throw new BadRequestException(problem('leads.converted_locked', 'A converted lead stays won'));
      }
      checkLost(next);

      const before: Values = {
        name: current.name,
        contactName: current.contactName,
        email: current.email,
        phone: current.phone,
        source: current.source,
        services: current.services.length ? current.services : null,
        estimatedValue: current.estimatedValue,
        status: current.status,
        ownerId: current.owner?.id ?? null,
        nextFollowUpDate: current.nextFollowUpDate,
        lostReason: current.lostReason,
        notes: current.notes,
      };
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const field of FIELDS) {
        const from = before[field];
        const to = next[field];
        if (JSON.stringify(from) === JSON.stringify(to)) continue;
        if (field === 'ownerId') {
          changes['owner'] = { from: current.owner?.name ?? null, to: await this.activeOwner(db, next.ownerId) };
        } else {
          changes[field] = { from, to };
        }
      }
      if (!Object.keys(changes).length) return (await this.load(db, id))!;

      await db.query(
        `UPDATE "Lead" SET ${FIELDS.map((f, i) => `"${f}" = $${i + 2}`).join(', ')},
                "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [id, ...FIELDS.map((f) => asParam(f, next[f]))],
      );
      await this.audit.record(db, context, {
        action: 'lead.updated',
        entityType: 'Lead',
        entityId: id,
        summary: `Edited lead ${next.name as string}`,
        changes,
      });
      return (await this.load(db, id))!;
    });
  }

  /**
   * Log a contact with the lead. A new lead becomes "Contacted", and the
   * planned follow-up date moves when a new one is given.
   */
  async addFollowUp(viewer: AuthUser, id: number, data: FollowUpDto, context: AuditContext): Promise<LeadDetail> {
    return this.transaction(async (db) => {
      await this.assertVisible(db, viewer, id, 'leads.edit');
      const current = (await this.lockLead(db, id))!;
      await db.query(
        `INSERT INTO "LeadFollowUp" ("leadId", "kind", "note", "happenedOn", "createdById")
         VALUES ($1, $2, $3, $4, $5)`,
        [id, data.kind, data.note, data.happenedOn, viewer.employeeId],
      );
      const status = current.status === 'New' ? 'Contacted' : current.status;
      const nextDate = data.nextFollowUpDate === undefined ? current.nextFollowUpDate : data.nextFollowUpDate;
      await db.query(
        `UPDATE "Lead" SET "status" = $2, "nextFollowUpDate" = $3, "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [id, status, nextDate],
      );
      await this.audit.record(db, context, {
        action: 'lead.follow_up_added',
        entityType: 'Lead',
        entityId: id,
        summary: `${data.kind} with ${current.name}`,
        changes: {
          note: data.note,
          happenedOn: data.happenedOn,
          ...(status !== current.status ? { status: { from: current.status, to: status } } : {}),
          ...(nextDate !== current.nextFollowUpDate
            ? { nextFollowUpDate: { from: current.nextFollowUpDate, to: nextDate } }
            : {}),
        },
      });
      return (await this.load(db, id))!;
    });
  }

  /** Turn the lead into a client in one step; the lead becomes "Won". */
  async convert(viewer: AuthUser, id: number, context: AuditContext): Promise<{ lead: LeadDetail; client: ClientDetail }> {
    if (!viewer.permissions['clients.create']) {
      throw new ForbiddenException(problem('leads.convert_forbidden', 'Adding clients is not allowed for you'));
    }
    return this.transaction(async (db) => {
      await this.assertVisible(db, viewer, id, 'leads.edit');
      const lead = (await this.lockLead(db, id))!;
      if (lead.client) throw new BadRequestException(problem('leads.already_converted', 'This lead is already a client'));
      if (lead.status === 'Lost') {
        throw new BadRequestException(problem('leads.lost_cannot_convert', 'A lost lead cannot become a client'));
      }
      // The owner becomes account manager only while still active.
      const owner = lead.owner
        ? (await db.query(`SELECT 1 FROM "Employee" WHERE "id" = $1 AND "status" = 'Active'`, [lead.owner.id])).rowCount
        : 0;
      const client = await this.clients.createIn(
        db,
        {
          name: lead.name,
          companyName: lead.name,
          contactName: lead.contactName,
          contactEmail: lead.email,
          contactPhone: lead.phone,
          accountManagerId: owner ? lead.owner!.id : null,
          notes: lead.notes,
        },
        context,
      );
      await db.query(
        `UPDATE "Lead" SET "status" = 'Won', "clientId" = $2, "lostReason" = NULL,
                "nextFollowUpDate" = NULL, "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [id, client.id],
      );
      await this.audit.record(db, context, {
        action: 'lead.converted',
        entityType: 'Lead',
        entityId: id,
        summary: `Converted lead ${lead.name} into client ${client.clientCode}`,
        changes: { status: { from: lead.status, to: 'Won' }, client: client.clientCode },
      });
      return { lead: (await this.load(db, id))!, client };
    });
  }

  /** Archives the lead; its history stays. */
  async remove(viewer: AuthUser, id: number, context: AuditContext): Promise<void> {
    await this.transaction(async (db) => {
      await this.assertVisible(db, viewer, id, 'leads.view');
      const lead = (await this.lockLead(db, id))!;
      await db.query(`UPDATE "Lead" SET "archivedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1`, [id]);
      await this.audit.record(db, context, {
        action: 'lead.deleted',
        entityType: 'Lead',
        entityId: id,
        summary: `Removed lead ${lead.name}`,
      });
    });
  }

  private async assertVisible(
    db: Pick<PoolClient, 'query'>,
    viewer: AuthUser,
    id: number,
    permission: 'leads.view' | 'leads.edit',
  ): Promise<void> {
    const params: unknown[] = [id];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const found = await db.query<{ visible: boolean; allowed: boolean }>(
      `SELECT ${leadVisibleTo(viewer, 'leads.view', param)} AS "visible",
              ${leadVisibleTo(viewer, permission, param)} AS "allowed"
       FROM "Lead" l WHERE l."id" = $1 AND l."archivedAt" IS NULL`,
      params,
    );
    if (!found.rows[0]?.visible) throw new NotFoundException(problem('leads.not_found', 'Lead not found'));
    if (!found.rows[0].allowed) {
      throw new ForbiddenException(problem('auth.forbidden', 'You do not have permission to do this'));
    }
  }

  private async lockLead(db: PoolClient, id: number): Promise<LeadDetail | undefined> {
    await db.query(`SELECT 1 FROM "Lead" WHERE "id" = $1 FOR UPDATE`, [id]);
    return this.load(db, id);
  }

  private async load(db: Pick<PoolClient, 'query'>, id: number): Promise<LeadDetail | undefined> {
    const lead = (await db.query<Lead>(`${SELECT} WHERE l."id" = $1`, [id])).rows[0];
    if (!lead) return undefined;
    const followUps = await db.query<FollowUp>(
      `SELECT f."id", f."kind", f."note", f."happenedOn", f."createdAt",
              json_build_object('id', e."id", 'name', e."name") AS "createdBy"
       FROM "LeadFollowUp" f JOIN "Employee" e ON e."id" = f."createdById"
       WHERE f."leadId" = $1 ORDER BY f."happenedOn" DESC, f."id" DESC`,
      [id],
    );
    return { ...lead, followUps: followUps.rows };
  }

  /** The owner's name; refuses anyone who is not an active employee. */
  private async activeOwner(db: PoolClient, id: number | null): Promise<string | null> {
    if (id === null) return null;
    const found = await db.query<{ name: string }>(
      `SELECT "name" FROM "Employee" WHERE "id" = $1 AND "status" = 'Active' FOR SHARE`,
      [id],
    );
    if (!found.rows[0]) {
      throw new BadRequestException(problem('leads.inactive_owner', 'The owner must be an active employee'));
    }
    return found.rows[0].name;
  }

  private async transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      const result = await work(connection);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      await connection.query('ROLLBACK');
      const code = (error as { code?: string }).code;
      if (code === '22007' || code === '22008') {
        throw new BadRequestException(problem('invalid_date', 'A date is not valid'));
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

function checkLost(values: Values): void {
  if (values.status === 'Lost' && !values.lostReason) {
    throw new BadRequestException(problem('leads.lost_reason_required', 'Say why the lead was lost'));
  }
}
