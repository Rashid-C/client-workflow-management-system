import { BadRequestException, ConflictException, ForbiddenException, Inject, Injectable } from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { DailyUpdateQueryDto, SaveDailyUpdateDto } from './dto.js';

const TIME_ZONE = process.env['APP_TIME_ZONE'] ?? 'Asia/Dubai';
const TODAY = `(now() AT TIME ZONE '${TIME_ZONE}')::date`;
const PAGE = 50;

type PersonRef = { id: number; name: string };

export interface DailyUpdate {
  id: number;
  employee: PersonRef & { designation: string };
  day: string;
  done: string;
  plan: string | null;
  blockers: string | null;
  /** Time the person logged that day, from time entries. */
  loggedMinutes: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/** What the viewer worked on today, to help write the update. */
export interface TodayWork {
  taskId: number;
  title: string;
  clientName: string;
  stageName: string;
  minutes: number;
}

export interface Today {
  day: string;
  update: DailyUpdate | null;
  loggedMinutes: number;
  work: TodayWork[];
}

const SELECT = `
  SELECT u."id", u."day", u."done", u."plan", u."blockers", u."version", u."createdAt", u."updatedAt",
         json_build_object('id', e."id", 'name', e."name", 'designation', e."designation") AS "employee",
         COALESCE((SELECT sum(t."minutes") FROM "TimeEntry" t
                   WHERE t."employeeId" = u."employeeId" AND t."workDate" = u."day"), 0)::int AS "loggedMinutes"
  FROM "DailyUpdate" u JOIN "Employee" e ON e."id" = u."employeeId"`;

@Injectable()
export class DailyUpdatesService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async today(viewer: AuthUser): Promise<Today> {
    const day = (await this.pool.query<{ day: string }>(`SELECT ${TODAY}::text AS "day"`)).rows[0].day;
    const update = (await this.pool.query<DailyUpdate>(
      `${SELECT} WHERE u."employeeId" = $1 AND u."day" = $2`,
      [viewer.employeeId, day],
    )).rows[0] ?? null;
    const work = await this.pool.query<TodayWork>(
      `SELECT t."id" AS "taskId", t."title", c."name" AS "clientName", s."name" AS "stageName",
              sum(te."minutes")::int AS "minutes"
       FROM "TimeEntry" te
       JOIN "Task" t ON t."id" = te."taskId"
       JOIN "Client" c ON c."id" = t."clientId"
       JOIN "TaskStage" s ON s."id" = te."taskStageId"
       WHERE te."employeeId" = $1 AND te."workDate" = $2
       GROUP BY t."id", t."title", c."name", s."id", s."name"
       ORDER BY sum(te."minutes") DESC`,
      [viewer.employeeId, day],
    );
    return {
      day,
      update,
      loggedMinutes: work.rows.reduce((total, row) => total + row.minutes, 0),
      work: work.rows,
    };
  }

  /** Post or edit the viewer's update for today; earlier days are closed. */
  async saveToday(viewer: AuthUser, data: SaveDailyUpdateDto, context: AuditContext): Promise<DailyUpdate> {
    const next = { done: data.done, plan: data.plan ?? null, blockers: data.blockers ?? null };
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      const day = (await connection.query<{ day: string }>(`SELECT ${TODAY}::text AS "day"`)).rows[0].day;
      const current = (await connection.query<DailyUpdate>(
        `SELECT "id", "done", "plan", "blockers", "version" FROM "DailyUpdate"
         WHERE "employeeId" = $1 AND "day" = $2 FOR UPDATE`,
        [viewer.employeeId, day],
      )).rows[0];

      let id: number;
      if (!current) {
        if (data.version !== undefined) throw stale();
        id = (await connection.query<{ id: number }>(
          `INSERT INTO "DailyUpdate" ("employeeId", "day", "done", "plan", "blockers", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING "id"`,
          [viewer.employeeId, day, next.done, next.plan, next.blockers],
        )).rows[0].id;
        await this.audit.record(connection, context, {
          action: 'daily_update.posted',
          entityType: 'DailyUpdate',
          entityId: id,
          summary: `${viewer.name} posted the update for ${day}`,
          changes: next,
        });
      } else {
        // Someone (the same person on another device) saved in between.
        if (data.version !== current.version) throw stale();
        id = current.id;
        const changes: Record<string, { from: unknown; to: unknown }> = {};
        for (const field of ['done', 'plan', 'blockers'] as const) {
          if (current[field] !== next[field]) changes[field] = { from: current[field], to: next[field] };
        }
        if (Object.keys(changes).length) {
          await connection.query(
            `UPDATE "DailyUpdate" SET "done" = $2, "plan" = $3, "blockers" = $4,
                    "version" = "version" + 1, "updatedAt" = NOW()
             WHERE "id" = $1`,
            [id, next.done, next.plan, next.blockers],
          );
          await this.audit.record(connection, context, {
            action: 'daily_update.edited',
            entityType: 'DailyUpdate',
            entityId: id,
            summary: `${viewer.name} edited the update for ${day}`,
            changes,
          });
        }
      }
      const saved = (await connection.query<DailyUpdate>(`${SELECT} WHERE u."id" = $1`, [id])).rows[0];
      await connection.query('COMMIT');
      return saved;
    } catch (error) {
      await connection.query('ROLLBACK');
      // Two first posts at once: the second sees the unique key.
      if ((error as { code?: string }).code === '23505') throw stale();
      throw error;
    } finally {
      connection.release();
    }
  }

  /** The team's updates, newest day first; "own" sees only their own. */
  async list(viewer: AuthUser, query: DailyUpdateQueryDto): Promise<{ items: DailyUpdate[]; nextBefore: number | null }> {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const where: string[] = [];
    if (viewer.permissions['daily_updates.view'] !== 'all') where.push(`u."employeeId" = ${param(viewer.employeeId)}`);
    if (query.employeeId) where.push(`u."employeeId" = ${param(query.employeeId)}`);
    if (query.day) where.push(`u."day" = ${param(query.day)}`);
    if (query.before) where.push(`u."id" < ${param(query.before)}`);
    try {
      const result = await this.pool.query<DailyUpdate>(
        `${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY u."id" DESC LIMIT ${PAGE + 1}`,
        params,
      );
      const items = result.rows.slice(0, PAGE);
      return { items, nextBefore: result.rows.length > PAGE ? items[items.length - 1].id : null };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '22007' || code === '22008') {
        throw new BadRequestException(problem('invalid_date', 'day is not a valid date'));
      }
      throw error;
    }
  }

  /** Active staff with no update for the day (team view only). */
  async missing(viewer: AuthUser, day: string | undefined): Promise<{ day: string; people: (PersonRef & { designation: string })[] }> {
    if (viewer.permissions['daily_updates.view'] !== 'all') {
      throw new ForbiddenException(problem('daily_updates.team_only', 'Only people who see the whole team can see this'));
    }
    const resolved = day ?? (await this.officeToday(this.pool));
    try {
      const result = await this.pool.query<PersonRef & { designation: string }>(
        `SELECT e."id", e."name", e."designation" FROM "Employee" e
         WHERE e."status" = 'Active'
           AND NOT EXISTS (SELECT 1 FROM "DailyUpdate" u WHERE u."employeeId" = e."id" AND u."day" = $1::date)
         ORDER BY lower(e."name")`,
        [resolved],
      );
      return { day: resolved, people: result.rows };
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === '22007' || code === '22008') {
        throw new BadRequestException(problem('invalid_date', 'day is not a valid date'));
      }
      throw error;
    }
  }

  private async officeToday(db: Pick<PoolClient, 'query'>): Promise<string> {
    return (await db.query<{ day: string }>(`SELECT ${TODAY}::text AS "day"`)).rows[0].day;
  }
}

const stale = () =>
  new ConflictException(
    problem('daily_updates.stale', 'Your update was changed elsewhere. Reload it and make your changes again.'),
  );
