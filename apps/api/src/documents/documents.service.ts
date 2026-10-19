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
import { clientVisibleTo } from '../clients/clients.service.js';
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { DocumentQueryDto, DocumentStatus, DocumentType, SaveDocumentDto, UpdateDocumentDto } from './dto.js';

const TIME_ZONE = process.env['APP_TIME_ZONE'] ?? 'Asia/Dubai';

export interface DocumentRecord {
  id: number;
  client: { id: number; name: string; clientCode: string };
  type: DocumentType;
  title: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  reminderDays: number;
  notes: string | null;
  status: DocumentStatus;
  /** Days until expiry in office time (negative once expired); null without expiry. */
  daysLeft: number | null;
  createdBy: { id: number; name: string };
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export type DocumentSummary = Record<DocumentStatus, number>;

const FIELDS = ['clientId', 'type', 'title', 'documentNumber', 'issueDate', 'expiryDate', 'reminderDays', 'notes'] as const;
type Values = Pick<SaveDocumentDto, 'clientId' | 'type'> & {
  title: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  reminderDays: number;
  notes: string | null;
};

// "Today" is the office's day, whatever the server's clock zone.
const TODAY = `(now() AT TIME ZONE '${TIME_ZONE}')::date`;
const STATUS = `CASE
    WHEN d."expiryDate" IS NULL THEN 'No expiry'
    WHEN d."expiryDate" < ${TODAY} THEN 'Expired'
    WHEN d."expiryDate" <= ${TODAY} + d."reminderDays" THEN 'Expiring soon'
    ELSE 'Valid' END`;

const SELECT = `
  SELECT d."id", d."type", d."title", d."documentNumber", d."issueDate", d."expiryDate",
         d."reminderDays", d."notes", d."version", d."createdAt", d."updatedAt",
         ${STATUS} AS "status",
         (d."expiryDate" - ${TODAY}) AS "daysLeft",
         json_build_object('id', c."id", 'name', c."name", 'clientCode', c."clientCode") AS "client",
         json_build_object('id', e."id", 'name', e."name") AS "createdBy"
  FROM "Document" d
  JOIN "Client" c ON c."id" = d."clientId"
  JOIN "Employee" e ON e."id" = d."createdById"`;

const describe = (doc: { type: string; title: string | null; client: { name: string } }) =>
  `${doc.type}${doc.title ? ` (${doc.title})` : ''} for ${doc.client.name}`;

/** `reminderDays` falls back to the given default when the form leaves it out. */
const normalize = (data: SaveDocumentDto, defaultReminderDays: number): Values => ({
  clientId: data.clientId,
  type: data.type,
  title: data.title ?? null,
  documentNumber: data.documentNumber ?? null,
  issueDate: data.issueDate ?? null,
  expiryDate: data.expiryDate ?? null,
  reminderDays: data.reminderDays ?? defaultReminderDays,
  notes: data.notes ?? null,
});

@Injectable()
export class DocumentsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  /** Live documents the viewer may see, soonest problem first. */
  async list(viewer: AuthUser, query: DocumentQueryDto): Promise<DocumentRecord[]> {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const where = ['d."archivedAt" IS NULL', clientVisibleTo(viewer, 'documents.view', param)];
    if (query.status) where.push(`${STATUS} = ${param(query.status)}`);
    if (query.clientId) where.push(`d."clientId" = ${param(query.clientId)}`);
    if (query.type) where.push(`d."type" = ${param(query.type)}`);
    if (query.search?.trim()) {
      const like = param(`%${query.search.trim().replace(/[\\%_]/g, '\\$&')}%`);
      where.push(`(c."name" ILIKE ${like} OR d."title" ILIKE ${like} OR d."documentNumber" ILIKE ${like})`);
    }
    const result = await this.pool.query<DocumentRecord>(
      `${SELECT} WHERE ${where.join(' AND ')}
       ORDER BY CASE ${STATUS} WHEN 'Expired' THEN 0 WHEN 'Expiring soon' THEN 1 WHEN 'Valid' THEN 2 ELSE 3 END,
                d."expiryDate" NULLS LAST, lower(c."name"), d."id"
       LIMIT 1000`,
      params,
    );
    return result.rows;
  }

  /** How many live documents are in each state (dashboard tiles). */
  async summary(viewer: AuthUser): Promise<DocumentSummary> {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const result = await this.pool.query<{ status: DocumentStatus; count: number }>(
      `SELECT ${STATUS} AS "status", count(*)::int AS "count"
       FROM "Document" d JOIN "Client" c ON c."id" = d."clientId"
       WHERE d."archivedAt" IS NULL AND ${clientVisibleTo(viewer, 'documents.view', param)}
       GROUP BY 1`,
      params,
    );
    const summary: DocumentSummary = { Expired: 0, 'Expiring soon': 0, Valid: 0, 'No expiry': 0 };
    for (const row of result.rows) summary[row.status] = row.count;
    return summary;
  }

  async create(viewer: AuthUser, data: SaveDocumentDto, context: AuditContext): Promise<DocumentRecord> {
    return this.transaction(async (db) => {
      // The firm's default (Settings), else 30.
      const fallback = (await db.query<{ days: number }>(
        `SELECT COALESCE((SELECT "documentReminderDays" FROM "Setting" WHERE "id" = 1), 30) AS "days"`,
      )).rows[0].days;
      const values = normalize(data, fallback);
      checkDates(values);
      await this.assertClientUsable(db, viewer, values.clientId);
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "Document" (${FIELDS.map((f) => `"${f}"`).join(', ')}, "createdById", "updatedAt")
         VALUES (${FIELDS.map((_, i) => `$${i + 1}`).join(', ')}, $${FIELDS.length + 1}, NOW())
         RETURNING "id"`,
        [...FIELDS.map((f) => values[f]), viewer.employeeId],
      );
      const doc = (await this.load(db, inserted.rows[0].id))!;
      await this.audit.record(db, context, {
        action: 'document.created',
        entityType: 'Document',
        entityId: doc.id,
        summary: `Added ${describe(doc)}`,
        changes: Object.fromEntries(
          Object.entries({ ...values, client: doc.client.name, clientId: undefined }).filter(
            ([, v]) => v !== null && v !== undefined,
          ),
        ),
      });
      return doc;
    });
  }

  async update(viewer: AuthUser, id: number, data: UpdateDocumentDto, context: AuditContext): Promise<DocumentRecord> {
    return this.transaction(async (db) => {
      const current = await this.lockVisible(db, viewer, id, 'documents.edit');
      // Left out on an edit means "keep what it has".
      const next = normalize(data, current.reminderDays);
      checkDates(next);
      if (current.version !== data.version) {
        throw new ConflictException(
          problem('documents.stale', 'Someone else changed this document. Reload it and make your changes again.'),
        );
      }
      if (next.clientId !== current.client.id) await this.assertClientUsable(db, viewer, next.clientId);

      const before: Values = {
        clientId: current.client.id,
        type: current.type,
        title: current.title,
        documentNumber: current.documentNumber,
        issueDate: current.issueDate,
        expiryDate: current.expiryDate,
        reminderDays: current.reminderDays,
        notes: current.notes,
      };
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const field of FIELDS) {
        if (before[field] !== next[field]) changes[field] = { from: before[field], to: next[field] };
      }
      if (!Object.keys(changes).length) return current;

      await db.query(
        `UPDATE "Document" SET ${FIELDS.map((f, i) => `"${f}" = $${i + 2}`).join(', ')},
                "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [id, ...FIELDS.map((f) => next[f])],
      );
      const doc = (await this.load(db, id))!;
      await this.audit.record(db, context, {
        action: 'document.updated',
        entityType: 'Document',
        entityId: id,
        summary: `Edited ${describe(doc)}`,
        changes,
      });
      return doc;
    });
  }

  /** Archives the document; its record and history stay. */
  async remove(viewer: AuthUser, id: number, context: AuditContext): Promise<void> {
    await this.transaction(async (db) => {
      const current = await this.lockVisible(db, viewer, id, 'documents.view');
      await db.query(`UPDATE "Document" SET "archivedAt" = NOW(), "updatedAt" = NOW() WHERE "id" = $1`, [id]);
      await this.audit.record(db, context, {
        action: 'document.deleted',
        entityType: 'Document',
        entityId: id,
        summary: `Removed ${describe(current)}`,
        changes: { documentNumber: current.documentNumber, expiryDate: current.expiryDate },
      });
    });
  }

  /** The live document, locked: 404 outside the viewer's scope, 403 if only viewable. */
  private async lockVisible(
    db: PoolClient,
    viewer: AuthUser,
    id: number,
    permission: 'documents.view' | 'documents.edit',
  ): Promise<DocumentRecord> {
    const params: unknown[] = [id];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const found = await db.query<{ visible: boolean; allowed: boolean }>(
      `SELECT ${clientVisibleTo(viewer, 'documents.view', param)} AS "visible",
              ${clientVisibleTo(viewer, permission, param)} AS "allowed"
       FROM "Document" d JOIN "Client" c ON c."id" = d."clientId"
       WHERE d."id" = $1 AND d."archivedAt" IS NULL
       FOR UPDATE OF d`,
      params,
    );
    if (!found.rows[0]?.visible) throw new NotFoundException(problem('documents.not_found', 'Document not found'));
    if (!found.rows[0].allowed) {
      throw new ForbiddenException(problem('auth.forbidden', 'You do not have permission to do this'));
    }
    return (await this.load(db, id))!;
  }

  /** The client exists, is in the viewer's scope and is not archived. */
  private async assertClientUsable(db: PoolClient, viewer: AuthUser, clientId: number): Promise<void> {
    const params: unknown[] = [clientId];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const found = await db.query<{ name: string; isActive: boolean }>(
      `SELECT c."name", c."isActive" FROM "Client" c
       WHERE c."id" = $1 AND ${clientVisibleTo(viewer, 'documents.view', param)} FOR SHARE`,
      params,
    );
    const client = found.rows[0];
    if (!client) throw new BadRequestException(problem('documents.client_not_found', 'Client not found'));
    if (!client.isActive) {
      throw new BadRequestException(
        problem('documents.client_archived', `${client.name} is archived`, { name: client.name }),
      );
    }
  }

  private async load(db: Pick<PoolClient, 'query'>, id: number): Promise<DocumentRecord | undefined> {
    const result = await db.query<DocumentRecord>(`${SELECT} WHERE d."id" = $1`, [id]);
    return result.rows[0];
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

function checkDates(values: Values): void {
  if (values.issueDate && values.expiryDate && values.expiryDate < values.issueDate) {
    throw new BadRequestException(problem('documents.invalid_dates', 'The expiry date is before the issue date'));
  }
}
