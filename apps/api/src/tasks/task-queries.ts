import type { PoolClient } from 'pg';
import type { AuthUser } from '../auth/session.js';
import type { WorkStatus } from './work-status.js';

export type Queryable = Pick<PoolClient, 'query'>;

export const TIME_ZONE = process.env['APP_TIME_ZONE'] ?? 'Asia/Dubai';

export interface PersonRef {
  id: number;
  name: string;
}

export interface TaskStageView {
  id: number;
  position: number;
  name: string;
  status: WorkStatus;
  assignee: (PersonRef & { designation: string; status: string }) | null;
  startedAt: Date | null;
  completedAt: Date | null;
  blockedReason: string | null;
  blockedAt: Date | null;
  blockedBy: PersonRef | null;
  minutes: number;
}

export interface TimeEntryView {
  id: number;
  stagePosition: number;
  stageName: string;
  employee: PersonRef;
  workDate: string;
  minutes: number;
  note: string | null;
  createdAt: Date;
}

export interface TaskDetail {
  id: number;
  title: string;
  description: string | null;
  status: WorkStatus;
  dueDate: string | null;
  archivedAt: Date | null;
  version: number;
  createdAt: Date;
  client: { id: number; name: string; clientCode: string };
  taskType: { id: number; name: string };
  createdBy: PersonRef;
  totalMinutes: number;
  stages: TaskStageView[];
  timeEntries: TimeEntryView[];
}

/**
 * SQL condition limiting tasks to what `viewer` may see under
 * `permission`. "own" covers tasks they created or hold a stage of.
 * `param` binds a value and returns its placeholder.
 */
export function visibleTo(
  viewer: AuthUser,
  permission: 'tasks.view' | 'tasks.edit',
  param: (value: unknown) => string,
  alias = 't',
): string {
  if (viewer.permissions[permission] === 'all') return 'TRUE';
  if (!viewer.permissions[permission]) return 'FALSE';
  const me = param(viewer.employeeId);
  return `(${alias}."createdById" = ${me} OR EXISTS (
    SELECT 1 FROM "TaskStage" vs
    WHERE vs."taskId" = ${alias}."id" AND vs."assigneeId" = ${me}))`;
}

/** The task page: the task, its stages and its time, in three queries. */
export async function loadTaskDetail(
  db: Queryable,
  taskId: number,
): Promise<TaskDetail | undefined> {
  const task = await db.query<Omit<TaskDetail, 'stages' | 'timeEntries' | 'totalMinutes'>>(
    `SELECT t."id", t."title", t."description", t."status", t."dueDate",
            t."archivedAt", t."version", t."createdAt",
            json_build_object('id', c."id", 'name', c."name", 'clientCode', c."clientCode") AS "client",
            json_build_object('id', tt."id", 'name', tt."name") AS "taskType",
            json_build_object('id', e."id", 'name', e."name") AS "createdBy"
     FROM "Task" t
     JOIN "Client" c ON c."id" = t."clientId"
     JOIN "TaskType" tt ON tt."id" = t."taskTypeId"
     JOIN "Employee" e ON e."id" = t."createdById"
     WHERE t."id" = $1`,
    [taskId],
  );
  if (!task.rows[0]) return undefined;

  const stages = await db.query<TaskStageView>(
    `SELECT s."id", s."position", s."name", s."status",
            CASE WHEN a."id" IS NULL THEN NULL ELSE json_build_object(
              'id', a."id", 'name', a."name", 'designation', a."designation", 'status', a."status")
            END AS "assignee",
            s."startedAt", s."completedAt", s."blockedReason", s."blockedAt",
            CASE WHEN b."id" IS NULL THEN NULL ELSE json_build_object('id', b."id", 'name', b."name") END AS "blockedBy",
            COALESCE((SELECT sum(te."minutes") FROM "TimeEntry" te WHERE te."taskStageId" = s."id"), 0)::int AS "minutes"
     FROM "TaskStage" s
     LEFT JOIN "Employee" a ON a."id" = s."assigneeId"
     LEFT JOIN "Employee" b ON b."id" = s."blockedById"
     WHERE s."taskId" = $1
     ORDER BY s."position"`,
    [taskId],
  );

  const time = await db.query<TimeEntryView>(
    `SELECT te."id", s."position" AS "stagePosition", s."name" AS "stageName",
            json_build_object('id', e."id", 'name', e."name") AS "employee",
            te."workDate", te."minutes", te."note", te."createdAt"
     FROM "TimeEntry" te
     JOIN "TaskStage" s ON s."id" = te."taskStageId"
     JOIN "Employee" e ON e."id" = te."employeeId"
     WHERE te."taskId" = $1
     ORDER BY te."workDate" DESC, te."id" DESC`,
    [taskId],
  );

  return {
    ...task.rows[0],
    stages: stages.rows,
    timeEntries: time.rows,
    totalMinutes: stages.rows.reduce((sum, stage) => sum + stage.minutes, 0),
  };
}

/** Escape LIKE wildcards so a search for "50%" means the text "50%". */
export function likeContains(text: string): string {
  return `%${text.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}
