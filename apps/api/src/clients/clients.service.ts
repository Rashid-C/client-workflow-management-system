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
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { CreateClientDto, UpdateClientDto } from './dto/create-client.dto.js';

export type PersonRef = { id: number; name: string };

/** The columns staff edit, in the order the form shows them. */
export const CLIENT_FIELDS = [
  'name',
  'companyName',
  'legalNameAr',
  'entityType',
  'jurisdiction',
  'freeZone',
  'emirate',
  'tradeLicenseNumber',
  'licenseAuthority',
  'businessActivity',
  'vatTrn',
  'corporateTaxTrn',
  'financialYearEndMonth',
  'email',
  'phone',
  'address',
  'contactName',
  'contactDesignation',
  'contactEmail',
  'contactPhone',
  'accountManagerId',
  'notes',
] as const;

type Field = (typeof CLIENT_FIELDS)[number];
type ClientValues = { name: string } & {
  [K in Exclude<Field, 'name' | 'financialYearEndMonth' | 'accountManagerId'>]: string | null;
} & { financialYearEndMonth: number | null; accountManagerId: number | null };

/** A row of the client list (also used by pickers elsewhere). */
export interface ClientSummary {
  id: number;
  clientCode: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  emirate: string | null;
  jurisdiction: string | null;
  vatTrn: string | null;
  isActive: boolean;
  accountManager: PersonRef | null;
  openTasks: number;
}

export interface ClientDetail extends ClientValues {
  id: number;
  clientCode: string;
  isActive: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  accountManager: PersonRef | null;
  openTasks: number;
  totalTasks: number;
}

const OPEN_TASKS = `(SELECT count(*)::int FROM "Task" t
   WHERE t."clientId" = c."id" AND t."archivedAt" IS NULL AND t."status" <> 'Completed')`;
const MANAGER = `CASE WHEN m."id" IS NULL THEN NULL
   ELSE json_build_object('id', m."id", 'name', m."name") END`;

/**
 * SQL condition: may `viewer` see (or edit) client `c`? "own" means a client
 * the viewer manages, or one with a task they created or hold a stage of.
 */
export function clientVisibleTo(
  viewer: AuthUser,
  permission: 'clients.view' | 'clients.edit',
  param: (value: unknown) => string,
  alias = 'c',
): string {
  const scope = viewer.permissions[permission];
  if (scope === 'all') return 'TRUE';
  if (!scope) return 'FALSE';
  const me = param(viewer.employeeId);
  return `(${alias}."accountManagerId" = ${me} OR EXISTS (
    SELECT 1 FROM "Task" vt
    WHERE vt."clientId" = ${alias}."id"
      AND (vt."createdById" = ${me} OR EXISTS (
        SELECT 1 FROM "TaskStage" vs WHERE vs."taskId" = vt."id" AND vs."assigneeId" = ${me}))))`;
}

/** The form's values as stored: missing means empty; free zone only for free zones. */
function normalize(data: CreateClientDto): ClientValues {
  const values = Object.fromEntries(
    CLIENT_FIELDS.map((field) => [field, data[field] ?? null]),
  ) as ClientValues;
  if (values.jurisdiction !== 'Free zone') values.freeZone = null;
  return values;
}

const ref = (client: { name: string; clientCode: string }) =>
  `${client.name} (${client.clientCode})`;

@Injectable()
export class ClientsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async findAll(viewer: AuthUser): Promise<ClientSummary[]> {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const result = await this.pool.query<ClientSummary>(
      `SELECT c."id", c."clientCode", c."name", c."companyName", c."email", c."phone",
              c."emirate", c."jurisdiction", c."vatTrn", c."isActive",
              ${MANAGER} AS "accountManager", ${OPEN_TASKS} AS "openTasks"
       FROM "Client" c LEFT JOIN "Employee" m ON m."id" = c."accountManagerId"
       WHERE ${clientVisibleTo(viewer, 'clients.view', param)}
       ORDER BY lower(c."name"), c."id"`,
      params,
    );
    return result.rows;
  }

  async accountManagers(): Promise<(PersonRef & { designation: string })[]> {
    const result = await this.pool.query<PersonRef & { designation: string }>(
      `SELECT "id", "name", "designation" FROM "Employee"
       WHERE "status" = 'Active' ORDER BY lower("name")`,
    );
    return result.rows;
  }

  async findOne(viewer: AuthUser, id: number): Promise<ClientDetail> {
    await this.assertVisible(this.pool, viewer, id, 'clients.view');
    return (await this.load(this.pool, id))!;
  }

  async create(data: CreateClientDto, context: AuditContext): Promise<ClientDetail> {
    return this.transaction(async (db) => {
      const values = normalize(data);
      const manager = await this.activeManager(db, values.accountManagerId);

      const params = CLIENT_FIELDS.map((field) => values[field]);
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "Client" ("clientCode", ${CLIENT_FIELDS.map((f) => `"${f}"`).join(', ')}, "updatedAt")
         SELECT 'CL-' || lpad(s.n::text, greatest(4, length(s.n::text)), '0'),
                ${CLIENT_FIELDS.map((_, i) => `$${i + 1}`).join(', ')}, NOW()
         FROM (SELECT nextval('"Client_code_seq"') AS n) s
         RETURNING "id"`,
        params,
      );
      const client = (await this.load(db, inserted.rows[0].id))!;

      // The history shows the manager's name, not an id.
      const shown: Record<string, unknown> = {
        clientCode: client.clientCode,
        ...values,
        accountManager: manager,
      };
      delete shown['accountManagerId'];
      await this.audit.record(db, context, {
        action: 'client.created',
        entityType: 'Client',
        entityId: client.id,
        summary: `Added client ${ref(client)}`,
        changes: Object.fromEntries(Object.entries(shown).filter(([, value]) => value !== null)),
      });
      return client;
    });
  }

  async update(
    viewer: AuthUser,
    id: number,
    data: UpdateClientDto,
    context: AuditContext,
  ): Promise<ClientDetail> {
    return this.transaction(async (db) => {
      await this.assertVisible(db, viewer, id, 'clients.edit');
      const current = (await db.query<ClientDetail>(
        `SELECT * FROM "Client" WHERE "id" = $1 FOR UPDATE`,
        [id],
      )).rows[0];
      if (!current.isActive) {
        throw new BadRequestException(problem('clients.archived', 'Restore the client before editing it'));
      }
      if (current.version !== data.version) {
        throw new ConflictException(
          problem('clients.stale', 'Someone else changed this client. Reload it and make your changes again.'),
        );
      }

      const next = normalize(data);
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const field of CLIENT_FIELDS) {
        if (field !== 'accountManagerId' && current[field] !== next[field]) {
          changes[field] = { from: current[field], to: next[field] };
        }
      }
      if (current.accountManagerId !== next.accountManagerId) {
        changes['accountManager'] = {
          from: await this.employeeName(db, current.accountManagerId),
          to: await this.activeManager(db, next.accountManagerId),
        };
      }
      if (!Object.keys(changes).length) return (await this.load(db, id))!;

      await db.query(
        `UPDATE "Client"
         SET ${CLIENT_FIELDS.map((f, i) => `"${f}" = $${i + 2}`).join(', ')},
             "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [id, ...CLIENT_FIELDS.map((field) => next[field])],
      );
      const client = (await this.load(db, id))!;
      await this.audit.record(db, context, {
        action: 'client.updated',
        entityType: 'Client',
        entityId: id,
        summary: `Edited client ${ref(client)}`,
        changes,
      });
      return client;
    });
  }

  /**
   * Archive (or restore) a client. Archived clients keep their history but
   * cannot get new tasks; a client with open work cannot be archived.
   */
  async setArchived(
    viewer: AuthUser,
    id: number,
    archived: boolean,
    reason: string | null,
    context: AuditContext,
  ): Promise<ClientDetail> {
    return this.transaction(async (db) => {
      await this.assertVisible(db, viewer, id, 'clients.view');
      const current = (await db.query<{ name: string; clientCode: string; isActive: boolean }>(
        `SELECT "name", "clientCode", "isActive" FROM "Client" WHERE "id" = $1 FOR UPDATE`,
        [id],
      )).rows[0];
      if (current.isActive !== archived) return (await this.load(db, id))!;

      if (archived) {
        const open = (await db.query<{ count: number }>(
          `SELECT count(*)::int AS "count" FROM "Task"
           WHERE "clientId" = $1 AND "archivedAt" IS NULL AND "status" <> 'Completed'`,
          [id],
        )).rows[0].count;
        if (open) {
          throw new BadRequestException(
            problem(
              'clients.has_open_tasks',
              `${current.name} has ${open} open task(s); complete or archive them first`,
              { count: open },
            ),
          );
        }
      }

      await db.query(
        `UPDATE "Client" SET "isActive" = $2, "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [id, !archived],
      );
      await this.audit.record(db, context, {
        action: archived ? 'client.archived' : 'client.restored',
        entityType: 'Client',
        entityId: id,
        summary: `${archived ? 'Archived' : 'Restored'} client ${ref(current)}`,
        reason: reason ?? undefined,
      });
      return (await this.load(db, id))!;
    });
  }

  /** 404 when the client is unknown or out of the viewer's scope; 403 when visible but not editable. */
  private async assertVisible(
    db: Pick<PoolClient, 'query'>,
    viewer: AuthUser,
    id: number,
    permission: 'clients.view' | 'clients.edit',
  ): Promise<void> {
    const params: unknown[] = [id];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const found = await db.query<{ visible: boolean; allowed: boolean }>(
      `SELECT ${clientVisibleTo(viewer, 'clients.view', param)} AS "visible",
              ${clientVisibleTo(viewer, permission, param)} AS "allowed"
       FROM "Client" c WHERE c."id" = $1`,
      params,
    );
    const row = found.rows[0];
    if (!row?.visible) throw new NotFoundException(problem('clients.not_found', 'Client not found'));
    if (!row.allowed) {
      throw new ForbiddenException(problem('auth.forbidden', 'You do not have permission to do this'));
    }
  }

  private async load(db: Pick<PoolClient, 'query'>, id: number): Promise<ClientDetail | undefined> {
    const result = await db.query<ClientDetail>(
      `SELECT c.*, ${MANAGER} AS "accountManager", ${OPEN_TASKS} AS "openTasks",
              (SELECT count(*)::int FROM "Task" t WHERE t."clientId" = c."id") AS "totalTasks"
       FROM "Client" c LEFT JOIN "Employee" m ON m."id" = c."accountManagerId"
       WHERE c."id" = $1`,
      [id],
    );
    return result.rows[0];
  }

  /** The manager's name; refuses anyone who is not an active employee. */
  private async activeManager(db: PoolClient, id: number | null): Promise<string | null> {
    if (id === null) return null;
    // FOR SHARE: the person cannot be deactivated until this commits.
    const found = await db.query<{ name: string }>(
      `SELECT "name" FROM "Employee" WHERE "id" = $1 AND "status" = 'Active' FOR SHARE`,
      [id],
    );
    if (!found.rows[0]) {
      throw new BadRequestException(
        problem('clients.inactive_manager', 'The account manager must be an active employee'),
      );
    }
    return found.rows[0].name;
  }

  private async employeeName(db: PoolClient, id: number | null): Promise<string | null> {
    if (id === null) return null;
    const found = await db.query<{ name: string }>(`SELECT "name" FROM "Employee" WHERE "id" = $1`, [id]);
    return found.rows[0]?.name ?? null;
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
      const { code, constraint } = error as { code?: string; constraint?: string };
      if (code === '23505') {
        if (constraint === 'Client_vatTrn_key') {
          throw new ConflictException(problem('clients.vat_trn_taken', 'Another client already has this VAT TRN'));
        }
        if (constraint === 'Client_corporateTaxTrn_key') {
          throw new ConflictException(
            problem('clients.ct_trn_taken', 'Another client already has this corporate tax TRN'),
          );
        }
        throw new ConflictException(problem('clients.code_taken', 'Client code already exists'));
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}
