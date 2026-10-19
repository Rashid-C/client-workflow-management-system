import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { problem } from '../common/errors.js';
import type { Pool, PoolClient } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { PermissionKey } from '../roles/permissions.js';
import type {
  BlockStageDto,
  CompleteStageDto,
  ReassignStageDto,
  ReopenStageDto,
} from './dto.js';
import {
  loadTaskDetail,
  TIME_ZONE,
  visibleTo,
  type TaskDetail,
} from './task-queries.js';
import { ref } from './tasks.service.js';
import {
  deriveTaskStatus,
  formatMinutes,
  nextStatus,
  stagesResetByReopen,
  transitionError,
  type StageAction,
  type WorkStatus,
} from './work-status.js';
import { notifyStageAssignee } from '../notifications/notification-writer.js';

const AUDIT_ACTIONS: Record<StageAction, string> = {
  start: 'task.stage_started',
  complete: 'task.stage_completed',
  block: 'task.stage_blocked',
  resume: 'task.stage_resumed',
  reassign: 'task.stage_reassigned',
  reopen: 'task.stage_reopened',
};

/** Key space for per-person "24 hours a day" time locks. */
const TIME_LOCK_SPACE = 7_301_002;
const MAX_MINUTES_PER_DAY = 24 * 60;

interface StageRow {
  id: number;
  position: number;
  name: string;
  status: WorkStatus;
  assigneeId: number | null;
  assigneeName: string | null;
}

interface ActionScope {
  db: PoolClient;
  task: { id: number; title: string };
  stages: StageRow[];
  stage: StageRow;
  user: AuthUser;
  context: AuditContext;
}

@Injectable()
export class TaskStagesService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  start(user: AuthUser, taskId: number, position: number, context: AuditContext) {
    return this.act('start', user, taskId, position, context, async (s) => {
      this.requireOnStage(s, 'tasks.complete');
      await s.db.query(
        `UPDATE "TaskStage" SET "status" = 'In progress',
                "startedAt" = COALESCE("startedAt", NOW()), "updatedAt" = NOW()
         WHERE "id" = $1`,
        [s.stage.id],
      );
      return { summary: `Started stage ${label(s.stage)}` };
    });
  }

  complete(
    user: AuthUser,
    taskId: number,
    position: number,
    data: CompleteStageDto,
    context: AuditContext,
  ) {
    // Also enforced by the DTO; kept here so the rule holds for any caller.
    if (!Number.isInteger(data.minutes) || data.minutes < 1) {
      throw new BadRequestException(problem('tasks.time_required', 'Enter the time spent'));
    }
    return this.act('complete', user, taskId, position, context, async (s) => {
      this.requireOnStage(s, 'tasks.complete');

      const next = s.stages.find((stage) => stage.position === position + 1);
      let handover: string | undefined;
      if (data.nextAssigneeId !== undefined) {
        if (!user.permissions['tasks.assign']) {
          throw new ForbiddenException(problem('tasks.handover_forbidden', 'You do not have permission to hand over stages'));
        }
        if (!next) throw new BadRequestException(problem('tasks.last_stage', 'This is the last stage; there is no next stage'));
        handover = await this.activeEmployeeName(s.db, data.nextAssigneeId);
      }

      const date = await this.logTime(s, data.minutes, data.workDate, data.comment);
      await s.db.query(
        `UPDATE "TaskStage" SET "status" = 'Completed', "completedAt" = NOW(), "updatedAt" = NOW()
         WHERE "id" = $1`,
        [s.stage.id],
      );
      if (next && data.nextAssigneeId !== undefined) {
        await s.db.query(
          `UPDATE "TaskStage" SET "assigneeId" = $2, "updatedAt" = NOW() WHERE "id" = $1`,
          [next.id, data.nextAssigneeId],
        );
        await notifyStageAssignee(s.db, {
          employeeId: data.nextAssigneeId,
          taskId: s.task.id,
          taskTitle: s.task.title,
          stageId: next.id,
          stageName: next.name,
          position: next.position,
        }, this.audit, s.context);
      }

      return {
        summary:
          `Completed stage ${label(s.stage)} (${formatMinutes(data.minutes)})` +
          (handover ? `; handed ${label(next!)} to ${handover}` : ''),
        reason: data.comment,
        changes: {
          minutes: data.minutes,
          workDate: date,
          ...(handover ? { nextStage: { position: next!.position, assignee: handover } } : {}),
        },
      };
    });
  }

  block(
    user: AuthUser,
    taskId: number,
    position: number,
    data: BlockStageDto,
    context: AuditContext,
  ) {
    return this.act('block', user, taskId, position, context, async (s) => {
      this.requireOnStage(s, 'tasks.complete');
      const reason = data.reason.trim();
      if (!reason) throw new BadRequestException(problem('tasks.block_reason_required', 'Say why the stage is blocked'));

      const date =
        data.minutes !== undefined
          ? await this.logTime(s, data.minutes, data.workDate, reason)
          : undefined;
      await s.db.query(
        `UPDATE "TaskStage" SET "status" = 'Blocked', "blockedReason" = $2,
                "blockedAt" = NOW(), "blockedById" = $3, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [s.stage.id, reason, user.employeeId],
      );
      return {
        summary: `Blocked stage ${label(s.stage)}`,
        reason,
        changes: data.minutes !== undefined ? { minutes: data.minutes, workDate: date } : undefined,
      };
    });
  }

  resume(user: AuthUser, taskId: number, position: number, context: AuditContext) {
    return this.act('resume', user, taskId, position, context, async (s) => {
      this.requireOnStage(s, 'tasks.complete');
      await s.db.query(
        `UPDATE "TaskStage" SET "status" = 'In progress', "blockedReason" = NULL,
                "blockedAt" = NULL, "blockedById" = NULL,
                "startedAt" = COALESCE("startedAt", NOW()), "updatedAt" = NOW()
         WHERE "id" = $1`,
        [s.stage.id],
      );
      return { summary: `Resumed stage ${label(s.stage)}` };
    });
  }

  reassign(
    user: AuthUser,
    taskId: number,
    position: number,
    data: ReassignStageDto,
    context: AuditContext,
  ) {
    return this.act('reassign', user, taskId, position, context, async (s) => {
      // "own": you can hand over a stage that is yours.
      this.requireOnStage(s, 'tasks.assign');
      if (data.assigneeId === s.stage.assigneeId) {
        throw new BadRequestException(problem('tasks.already_assigned', 'The stage is already assigned to that person'));
      }
      const comment = data.comment?.trim();
      if (s.stage.assigneeId !== null && !comment) {
        throw new BadRequestException(problem('tasks.reassign_comment_required', 'Add a comment when moving a stage from one person to another'));
      }

      const toName =
        data.assigneeId === null ? null : await this.activeEmployeeName(s.db, data.assigneeId);
      const date =
        data.minutes !== undefined
          ? await this.logTime(s, data.minutes, data.workDate, comment)
          : undefined;
      await s.db.query(
        `UPDATE "TaskStage" SET "assigneeId" = $2, "updatedAt" = NOW() WHERE "id" = $1`,
        [s.stage.id, data.assigneeId],
      );
      if (data.assigneeId !== null) await notifyStageAssignee(s.db, {
        employeeId: data.assigneeId,
        taskId: s.task.id,
        taskTitle: s.task.title,
        stageId: s.stage.id,
        stageName: s.stage.name,
        position: s.stage.position,
      }, this.audit, s.context);

      const from = s.stage.assigneeName;
      return {
        summary: toName
          ? from
            ? `Reassigned stage ${label(s.stage)} from ${from} to ${toName}`
            : `Assigned stage ${label(s.stage)} to ${toName}`
          : `Unassigned stage ${label(s.stage)} from ${from}`,
        reason: comment,
        changes: {
          assignee: { from, to: toName },
          ...(data.minutes !== undefined ? { minutes: data.minutes, workDate: date } : {}),
        },
      };
    });
  }

  reopen(
    user: AuthUser,
    taskId: number,
    position: number,
    data: ReopenStageDto,
    context: AuditContext,
  ) {
    return this.act('reopen', user, taskId, position, context, async (s) => {
      this.requireOnStage(s, 'tasks.reopen');
      const comment = data.comment.trim();
      if (!comment) throw new BadRequestException(problem('tasks.reopen_reason_required', 'Say why the stage is reopened'));

      const reset = stagesResetByReopen(s.stages, position);
      await s.db.query(
        `UPDATE "TaskStage" SET "status" = 'In progress', "completedAt" = NULL, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [s.stage.id],
      );
      if (reset.length) {
        await s.db.query(
          `UPDATE "TaskStage" SET "status" = 'Pending', "blockedReason" = NULL,
                  "blockedAt" = NULL, "blockedById" = NULL, "updatedAt" = NOW()
           WHERE "taskId" = $1 AND "position" = ANY($2::int[])`,
          [s.task.id, reset],
        );
      }
      return {
        summary: `Reopened stage ${label(s.stage)}`,
        reason: comment,
        changes: reset.length
          ? { movedBackToPending: s.stages.filter((st) => reset.includes(st.position)).map(label) }
          : undefined,
      };
    });
  }

  /**
   * The shared shape of every stage action: lock the task, check it is
   * visible and live, check the state machine, run the change, recompute the
   * task's status, and record it, all in one transaction.
   */
  private async act(
    action: StageAction,
    user: AuthUser,
    taskId: number,
    position: number,
    context: AuditContext,
    run: (scope: ActionScope) => Promise<{
      summary: string;
      reason?: string;
      changes?: Record<string, unknown>;
    }>,
  ): Promise<TaskDetail> {
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');

      const params: unknown[] = [taskId];
      const param = (value: unknown) => {
        params.push(value);
        return `$${params.length}`;
      };
      // Locking the task row serializes every change to its stages.
      const found = await connection.query<{ id: number; title: string; archivedAt: Date | null }>(
        `SELECT t."id", t."title", t."archivedAt" FROM "Task" t
         WHERE t."id" = $1 AND ${visibleTo(user, 'tasks.view', param)}
         FOR UPDATE OF t`,
        params,
      );
      const task = found.rows[0];
      if (!task) throw new NotFoundException(problem('tasks.not_found', 'Task not found'));
      if (task.archivedAt) throw new BadRequestException(problem('tasks.archived', 'Archived tasks cannot change'));

      const stages = (
        await connection.query<StageRow>(
          `SELECT s."id", s."position", s."name", s."status", s."assigneeId", e."name" AS "assigneeName"
           FROM "TaskStage" s LEFT JOIN "Employee" e ON e."id" = s."assigneeId"
           WHERE s."taskId" = $1 ORDER BY s."position"`,
          [taskId],
        )
      ).rows;

      const refusal = transitionError(action, stages, position);
      if (refusal?.code === 'tasks.stage_not_found') throw new NotFoundException(refusal);
      if (refusal) throw new BadRequestException(refusal);
      const stage = stages.find((s) => s.position === position)!;

      const entry = await run({ db: connection, task, stages, stage, user, context });

      // Recompute the task's status from the stages as they now are.
      const after = stages.map((s) =>
        s.position === position
          ? { ...s, status: nextStatus(action, s.status) }
          : action === 'reopen' && stagesResetByReopen(stages, position).includes(s.position)
            ? { ...s, status: 'Pending' as const }
            : s,
      );
      const taskStatus = deriveTaskStatus(after);
      await connection.query(
        `UPDATE "Task" SET "status" = $2, "updatedAt" = NOW() WHERE "id" = $1`,
        [taskId, taskStatus],
      );

      await this.audit.record(connection, context, {
        action: AUDIT_ACTIONS[action],
        entityType: 'Task',
        entityId: taskId,
        summary: `${ref(taskId)} ${task.title}: ${entry.summary}`,
        reason: entry.reason || undefined,
        changes: {
          stage: label(stage),
          ...(action === 'reassign'
            ? {}
            : { status: { from: stage.status, to: nextStatus(action, stage.status) } }),
          ...entry.changes,
        },
      });

      const detail = (await loadTaskDetail(connection, taskId))!;
      await connection.query('COMMIT');
      return detail;
    } catch (error) {
      await connection.query('ROLLBACK');
      const code = (error as { code?: string }).code;
      if (code === '22007' || code === '22008') {
        throw new BadRequestException(problem('invalid_date', 'workDate is not a valid date'));
      }
      throw error;
    } finally {
      connection.release();
    }
  }

  /** Require `permission`; at "own" scope the stage must be yours. */
  private requireOnStage({ user, stage }: ActionScope, permission: PermissionKey) {
    const scope = user.permissions[permission];
    if (!scope) throw new ForbiddenException(problem('auth.forbidden', 'You do not have permission to do this'));
    if (scope === 'own' && stage.assigneeId !== user.employeeId) {
      throw new ForbiddenException(problem('tasks.stage_not_yours', 'This stage is not assigned to you'));
    }
  }

  private async activeEmployeeName(db: PoolClient, employeeId: number): Promise<string> {
    const found = await db.query<{ name: string }>(
      `SELECT "name" FROM "Employee" WHERE "id" = $1 AND "status" = 'Active'`,
      [employeeId],
    );
    if (!found.rows[0]) {
      throw new BadRequestException(problem('tasks.inactive_assignee', 'Stages can only be assigned to active employees'));
    }
    return found.rows[0].name;
  }

  /**
   * Record the actor's time on the stage. Refuses future days and more than
   * 24 hours in one person's day; a per-person lock makes that check hold
   * under concurrent requests. Returns the office day used.
   */
  private async logTime(
    { db, stage, task, user }: ActionScope,
    minutes: number,
    workDate: string | undefined,
    note: string | undefined,
  ): Promise<string> {
    await db.query('SELECT pg_advisory_xact_lock($1, $2)', [TIME_LOCK_SPACE, user.employeeId]);

    const check = await db.query<{ day: string; future: boolean; used: number }>(
      `SELECT d."day"::text AS "day",
              d."day" > (now() AT TIME ZONE $3)::date AS "future",
              COALESCE((SELECT sum("minutes") FROM "TimeEntry"
                        WHERE "employeeId" = $1 AND "workDate" = d."day"), 0)::int AS "used"
       FROM (SELECT COALESCE($2::date, (now() AT TIME ZONE $3)::date) AS "day") d`,
      [user.employeeId, workDate ?? null, TIME_ZONE],
    );
    const { day, future, used } = check.rows[0];

    if (future) throw new BadRequestException(problem('tasks.future_time', 'Time cannot be logged for a future date'));
    if (used + minutes > MAX_MINUTES_PER_DAY) {
      throw new BadRequestException(
        problem(
          'tasks.day_full',
          `You already have ${formatMinutes(used)} logged on ${day}; a day holds at most 24 hours`,
          { usedMinutes: used, day },
        ),
      );
    }

    await db.query(
      `INSERT INTO "TimeEntry" ("taskStageId", "taskId", "employeeId", "workDate", "minutes", "note")
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [stage.id, task.id, user.employeeId, day, minutes, note?.trim() || null],
    );
    return day;
  }
}

function label(stage: { position: number; name: string }) {
  return `${stage.position}. ${stage.name}`;
}
