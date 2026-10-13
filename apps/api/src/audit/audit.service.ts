import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { ListAuditLogsQuery } from './dto.js';

/** Who acted and from where; built per request by the @Audit() decorator. */
export interface AuditContext {
  actor: { employeeId: number; name: string } | null;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditEntry {
  action: string;
  entityType: string;
  entityId: string | number;
  summary: string;
  /** { field: { from, to } } for updates; new values for creations. */
  changes?: Record<string, unknown>;
  reason?: string;
}

export interface AuditLogRecord {
  id: number;
  occurredAt: Date;
  actorEmployeeId: number | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changes: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
}

export interface AuditLogPage {
  items: AuditLogRecord[];
  /** Pass as `before` to fetch the next (older) page; null at the end. */
  nextBefore: number | null;
}

type Queryable = Pick<PoolClient, 'query'>;

const TIME_ZONE = process.env['APP_TIME_ZONE'] ?? 'Asia/Dubai';

@Injectable()
export class AuditService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  /**
   * Write one entry. Pass the transaction's connection so the entry commits
   * or rolls back together with the change it describes.
   */
  async record(
    db: Queryable,
    context: AuditContext,
    entry: AuditEntry,
  ): Promise<void> {
    await db.query(
      `INSERT INTO "AuditLog"
        ("actorEmployeeId", "actorName", "action", "entityType", "entityId",
         "summary", "changes", "reason", "ipAddress", "userAgent")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        context.actor?.employeeId ?? null,
        context.actor?.name ?? null,
        entry.action,
        entry.entityType,
        String(entry.entityId),
        entry.summary,
        entry.changes === undefined ? null : JSON.stringify(entry.changes),
        entry.reason ?? null,
        context.ipAddress ?? null,
        context.userAgent?.slice(0, 500) ?? null,
      ],
    );
  }

  /** Newest first, keyset-paginated on id so deep pages stay fast. */
  async list(viewer: AuthUser, query: ListAuditLogsQuery): Promise<AuditLogPage> {
    const where: string[] = [];
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    // "own" scope: what you did, and what was done to your own record.
    if (viewer.permissions['history.view'] !== 'all') {
      const me = param(viewer.employeeId);
      where.push(
        `("actorEmployeeId" = ${me} OR ("entityType" = 'Employee' AND "entityId" = ${me}::text))`,
      );
    }
    if (query.entityType) where.push(`"entityType" = ${param(query.entityType)}`);
    if (query.entityId) where.push(`"entityId" = ${param(query.entityId)}`);
    if (query.actorEmployeeId) {
      where.push(`"actorEmployeeId" = ${param(query.actorEmployeeId)}`);
    }
    if (query.action) where.push(`"action" = ${param(query.action)}`);
    // Dates are office days (Asia/Dubai), not UTC days.
    if (query.from) {
      where.push(
        `"occurredAt" >= (${param(query.from)}::date)::timestamp AT TIME ZONE ${param(TIME_ZONE)}`,
      );
    }
    if (query.to) {
      where.push(
        `"occurredAt" < (${param(query.to)}::date + 1)::timestamp AT TIME ZONE ${param(TIME_ZONE)}`,
      );
    }
    if (query.before) where.push(`"id" < ${param(query.before)}`);

    const limit = query.limit ?? 50;
    const result = await this.pool
      .query<AuditLogRecord>(
        `SELECT "id", "occurredAt", "actorEmployeeId", "actorName", "action",
                "entityType", "entityId", "summary", "changes", "reason", "ipAddress"
         FROM "AuditLog"
         ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY "id" DESC
         LIMIT ${param(limit + 1)}`,
        params,
      )
      .catch((error: { code?: string }) => {
        // An impossible day such as 2026-02-31 in from/to.
        if (error.code === '22007' || error.code === '22008') {
          throw new BadRequestException('from and to must be real dates');
        }
        throw error;
      });

    const items = result.rows.slice(0, limit);
    return {
      items,
      nextBefore: result.rows.length > limit ? items[items.length - 1].id : null,
    };
  }
}
