import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { problem } from '../common/errors.js';
import type { Pool } from 'pg';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { PersonRef } from '../tasks/task-queries.js';
import type { ListTimeEntriesQuery } from './dto.js';

export interface TimeLogEntry {
  id: number;
  workDate: string;
  minutes: number;
  note: string | null;
  employee: PersonRef;
  task: { id: number; title: string };
  client: { id: number; name: string };
  stage: { position: number; name: string };
}

export interface TimeLogPage {
  items: TimeLogEntry[];
  /** Pass as `before` for the next (older) page; null at the end. */
  nextBefore: string | null;
  /** Totals over every entry matching the filters, not just this page. */
  totalMinutes: number;
  byEmployee: (PersonRef & { minutes: number })[];
}

@Injectable()
export class TimeEntriesService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async list(viewer: AuthUser, query: ListTimeEntriesQuery): Promise<TimeLogPage> {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    const where: string[] = [];
    // "own" scope: only your own time, whatever employeeId asks for.
    if (viewer.permissions['time_logs.view'] !== 'all') {
      where.push(`te."employeeId" = ${param(viewer.employeeId)}`);
    } else if (query.employeeId) {
      where.push(`te."employeeId" = ${param(query.employeeId)}`);
    }
    if (query.clientId) where.push(`t."clientId" = ${param(query.clientId)}`);
    if (query.from) where.push(`te."workDate" >= ${param(query.from)}::date`);
    if (query.to) where.push(`te."workDate" <= ${param(query.to)}::date`);
    const filters = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const filterParams = [...params];

    // Page: newest office day first, keyset on (workDate, id).
    const pageWhere = [...where];
    if (query.before) {
      const [day, id] = query.before.split('_');
      pageWhere.push(`(te."workDate", te."id") < (${param(day)}::date, ${param(Number(id))})`);
    }
    const limit = query.limit ?? 50;

    try {
      const [page, totals] = await Promise.all([
        this.pool.query<TimeLogEntry>(
          `SELECT te."id", te."workDate", te."minutes", te."note",
                  json_build_object('id', e."id", 'name', e."name") AS "employee",
                  json_build_object('id', t."id", 'title', t."title") AS "task",
                  json_build_object('id', c."id", 'name', c."name") AS "client",
                  json_build_object('position', s."position", 'name', s."name") AS "stage"
           FROM "TimeEntry" te
           JOIN "Employee" e ON e."id" = te."employeeId"
           JOIN "Task" t ON t."id" = te."taskId"
           JOIN "Client" c ON c."id" = t."clientId"
           JOIN "TaskStage" s ON s."id" = te."taskStageId"
           ${pageWhere.length ? `WHERE ${pageWhere.join(' AND ')}` : ''}
           ORDER BY te."workDate" DESC, te."id" DESC
           LIMIT ${param(limit + 1)}`,
          params,
        ),
        this.pool.query<PersonRef & { minutes: number }>(
          `SELECT e."id", e."name", sum(te."minutes")::int AS "minutes"
           FROM "TimeEntry" te
           JOIN "Employee" e ON e."id" = te."employeeId"
           JOIN "Task" t ON t."id" = te."taskId"
           ${filters}
           GROUP BY e."id"
           ORDER BY "minutes" DESC, lower(e."name")`,
          filterParams,
        ),
      ]);

      const items = page.rows.slice(0, limit);
      const last = items[items.length - 1];
      return {
        items,
        nextBefore: page.rows.length > limit ? `${last.workDate}_${last.id}` : null,
        totalMinutes: totals.rows.reduce((sum, row) => sum + row.minutes, 0),
        byEmployee: totals.rows,
      };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '22007' || code === '22008') {
        throw new BadRequestException(problem('invalid_date', 'from, to and before must be real dates'));
      }
      throw error;
    }
  }
}
