import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import type { AuthUser } from '../auth/session.js';
import { clientVisibleTo } from '../clients/clients.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { TIME_ZONE, type PersonRef } from '../tasks/task-queries.js';
import type { WorkStatus } from '../tasks/work-status.js';

export interface MyWorkItem {
  task: { id: number; title: string; dueDate: string | null; status: WorkStatus };
  client: { id: number; name: string };
  stage: { position: number; name: string; status: WorkStatus };
  /** Pending, but an earlier stage is not completed yet. */
  waiting: boolean;
}

export interface BlockedStage {
  task: { id: number; title: string };
  client: { id: number; name: string };
  stage: { position: number; name: string };
  assignee: PersonRef | null;
  reason: string | null;
  blockedBy: PersonRef | null;
  blockedAt: Date | null;
}

export interface DueSoonTask {
  id: number;
  title: string;
  dueDate: string;
  status: WorkStatus;
  client: { id: number; name: string };
}

export interface Workload {
  employee: PersonRef & { designation: string };
  openStages: number;
  minutesThisWeek: number;
}

export interface Dashboard {
  me: { inProgress: number; pending: number; blocked: number; minutesThisWeek: number };
  myWork: MyWorkItem[];
  alerts: {
    documents: number | null;
    leadFollowUps: number | null;
    missingDailyUpdates: number | null;
    unreadNotifications: number;
  };
  /** Only for people who can see every task (managers). */
  team: {
    openTasks: number;
    inProgress: number;
    blocked: number;
    overdue: number;
    unassignedStages: number;
    blockedStages: BlockedStage[];
    dueSoon: DueSoonTask[];
    workload: Workload[];
  } | null;
}

// Office "today" and the Monday that starts this week, in Asia/Dubai.
const TODAY = `(now() AT TIME ZONE $1)::date`;
const WEEK_START = `date_trunc('week', (now() AT TIME ZONE $1))::date`;

@Injectable()
export class DashboardService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async get(viewer: AuthUser): Promise<Dashboard> {
    const [me, myWork, team, alerts] = await Promise.all([
      this.myCounts(viewer.employeeId),
      this.myWork(viewer.employeeId),
      viewer.permissions['tasks.view'] === 'all' ? this.team() : Promise.resolve(null),
      this.alerts(viewer),
    ]);
    return { me, myWork, team, alerts };
  }

  /** Permission-gated scalar counts; all dashboard alert data uses one query. */
  private async alerts(viewer: AuthUser): Promise<Dashboard['alerts']> {
    const params: unknown[] = [TIME_ZONE, viewer.employeeId];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const docScope = viewer.permissions['documents.view']
      ? clientVisibleTo(viewer, 'documents.view', param)
      : 'FALSE';
    const leadScope = viewer.permissions['leads.view'] === 'all'
      ? 'TRUE'
      : viewer.permissions['leads.view'] === 'own'
        ? `(l."ownerId" = $2 OR l."createdById" = $2)`
        : 'FALSE';
    const result = await this.pool.query<Dashboard['alerts']>(
      `SELECT
         (SELECT count(*)::int FROM "Document" d JOIN "Client" c ON c."id" = d."clientId"
          WHERE d."archivedAt" IS NULL AND d."expiryDate" IS NOT NULL
            AND (d."expiryDate" < ${TODAY} OR d."expiryDate" <= ${TODAY} + d."reminderDays")
            AND ${docScope}) AS "documents",
         (SELECT count(*)::int FROM "Lead" l
          WHERE l."archivedAt" IS NULL AND l."status" IN ('New', 'Contacted', 'Proposal sent')
            AND l."nextFollowUpDate" <= ${TODAY} AND ${leadScope}) AS "leadFollowUps",
         ${viewer.permissions['daily_updates.view'] === 'all'
           ? `(SELECT count(*)::int FROM "Employee" e WHERE e."status" = 'Active'
                AND NOT EXISTS (SELECT 1 FROM "DailyUpdate" u WHERE u."employeeId" = e."id" AND u."day" = ${TODAY}))`
           : 'NULL::int'} AS "missingDailyUpdates",
         (SELECT count(*)::int FROM "Notification" n WHERE n."employeeId" = $2 AND n."readAt" IS NULL)
           AS "unreadNotifications"`,
      params,
    );
    return result.rows[0];
  }

  private async myCounts(employeeId: number): Promise<Dashboard['me']> {
    const result = await this.pool.query<Dashboard['me']>(
      `SELECT
         (count(*) FILTER (WHERE s."status" = 'In progress'))::int AS "inProgress",
         (count(*) FILTER (WHERE s."status" = 'Pending'))::int AS "pending",
         (count(*) FILTER (WHERE s."status" = 'Blocked'))::int AS "blocked",
         (SELECT COALESCE(sum(te."minutes"), 0) FROM "TimeEntry" te
           WHERE te."employeeId" = $2 AND te."workDate" >= ${WEEK_START})::int AS "minutesThisWeek"
       FROM "TaskStage" s
       JOIN "Task" t ON t."id" = s."taskId" AND t."archivedAt" IS NULL
       WHERE s."assigneeId" = $2 AND s."status" <> 'Completed'`,
      [TIME_ZONE, employeeId],
    );
    return result.rows[0];
  }

  /** Every open stage assigned to the person, earliest due date first. */
  private async myWork(employeeId: number): Promise<MyWorkItem[]> {
    const result = await this.pool.query<MyWorkItem>(
      `SELECT json_build_object('id', t."id", 'title', t."title", 'dueDate', t."dueDate", 'status', t."status") AS "task",
              json_build_object('id', c."id", 'name', c."name") AS "client",
              json_build_object('position', s."position", 'name', s."name", 'status', s."status") AS "stage",
              (s."status" = 'Pending' AND EXISTS (
                 SELECT 1 FROM "TaskStage" e
                 WHERE e."taskId" = s."taskId" AND e."position" < s."position" AND e."status" <> 'Completed'
              )) AS "waiting"
       FROM "TaskStage" s
       JOIN "Task" t ON t."id" = s."taskId" AND t."archivedAt" IS NULL
       JOIN "Client" c ON c."id" = t."clientId"
       WHERE s."assigneeId" = $1 AND s."status" <> 'Completed'
       ORDER BY t."dueDate" ASC NULLS LAST, t."id", s."position"
       LIMIT 100`,
      [employeeId],
    );
    return result.rows;
  }

  private async team(): Promise<NonNullable<Dashboard['team']>> {
    const [counts, blocked, dueSoon, workload] = await Promise.all([
      this.pool.query<Omit<NonNullable<Dashboard['team']>, 'blockedStages' | 'dueSoon' | 'workload'>>(
        `SELECT
           (count(*) FILTER (WHERE t."status" <> 'Completed'))::int AS "openTasks",
           (count(*) FILTER (WHERE t."status" = 'In progress'))::int AS "inProgress",
           (count(*) FILTER (WHERE t."status" = 'Blocked'))::int AS "blocked",
           (count(*) FILTER (WHERE t."status" <> 'Completed' AND t."dueDate" < ${TODAY}))::int AS "overdue",
           (SELECT count(*) FROM "TaskStage" s
             JOIN "Task" ot ON ot."id" = s."taskId" AND ot."archivedAt" IS NULL
             WHERE s."assigneeId" IS NULL AND s."status" <> 'Completed')::int AS "unassignedStages"
         FROM "Task" t
         WHERE t."archivedAt" IS NULL`,
        [TIME_ZONE],
      ),
      this.pool.query<BlockedStage>(
        `SELECT json_build_object('id', t."id", 'title', t."title") AS "task",
                json_build_object('id', c."id", 'name', c."name") AS "client",
                json_build_object('position', s."position", 'name', s."name") AS "stage",
                CASE WHEN a."id" IS NULL THEN NULL ELSE json_build_object('id', a."id", 'name', a."name") END AS "assignee",
                s."blockedReason" AS "reason",
                CASE WHEN b."id" IS NULL THEN NULL ELSE json_build_object('id', b."id", 'name', b."name") END AS "blockedBy",
                s."blockedAt"
         FROM "TaskStage" s
         JOIN "Task" t ON t."id" = s."taskId" AND t."archivedAt" IS NULL
         JOIN "Client" c ON c."id" = t."clientId"
         LEFT JOIN "Employee" a ON a."id" = s."assigneeId"
         LEFT JOIN "Employee" b ON b."id" = s."blockedById"
         WHERE s."status" = 'Blocked'
         ORDER BY s."blockedAt" ASC NULLS LAST
         LIMIT 50`,
      ),
      this.pool.query<DueSoonTask>(
        `SELECT t."id", t."title", t."dueDate", t."status",
                json_build_object('id', c."id", 'name', c."name") AS "client"
         FROM "Task" t
         JOIN "Client" c ON c."id" = t."clientId"
         WHERE t."archivedAt" IS NULL AND t."status" <> 'Completed'
           AND t."dueDate" >= ${TODAY} AND t."dueDate" < ${TODAY} + 7
         ORDER BY t."dueDate", t."id"
         LIMIT 50`,
        [TIME_ZONE],
      ),
      this.pool.query<Workload>(
        `SELECT json_build_object('id', e."id", 'name', e."name", 'designation', e."designation") AS "employee",
                (SELECT count(*) FROM "TaskStage" s
                  JOIN "Task" t ON t."id" = s."taskId" AND t."archivedAt" IS NULL
                  WHERE s."assigneeId" = e."id" AND s."status" <> 'Completed')::int AS "openStages",
                (SELECT COALESCE(sum(te."minutes"), 0) FROM "TimeEntry" te
                  WHERE te."employeeId" = e."id" AND te."workDate" >= ${WEEK_START})::int AS "minutesThisWeek"
         FROM "Employee" e
         WHERE e."status" = 'Active'
         ORDER BY "openStages" DESC, "minutesThisWeek" DESC, lower(e."name")`,
        [TIME_ZONE],
      ),
    ]);

    return {
      ...counts.rows[0],
      blockedStages: blocked.rows,
      dueSoon: dueSoon.rows,
      workload: workload.rows,
    };
  }
}
