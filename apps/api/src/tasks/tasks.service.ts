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
import { POSTGRES_POOL } from '../database/database.module.js';
import type { CreateTaskDto, ListTasksQuery, UpdateTaskDto } from './dto.js';
import {
  likeContains,
  loadTaskDetail,
  TIME_ZONE,
  visibleTo,
  type PersonRef,
  type TaskDetail,
} from './task-queries.js';
import type { WorkStatus } from './work-status.js';

export interface TaskListItem {
  id: number;
  title: string;
  status: WorkStatus;
  dueDate: string | null;
  archivedAt: Date | null;
  createdAt: Date;
  client: { id: number; name: string; clientCode: string };
  taskType: { id: number; name: string };
  stagesTotal: number;
  stagesCompleted: number;
  /** The first stage not yet completed, or null when all are. */
  currentStage: { position: number; name: string; status: WorkStatus; assignee: PersonRef | null } | null;
}

export interface TaskPage {
  items: TaskListItem[];
  nextBefore: number | null;
}

@Injectable()
export class TasksService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  /** Newest first; one query with progress and current stage per task. */
  async list(viewer: AuthUser, query: ListTasksQuery): Promise<TaskPage> {
    const params: unknown[] = [];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };

    const where = [visibleTo(viewer, 'tasks.view', param)];
    if (!query.includeArchived) where.push('t."archivedAt" IS NULL');
    if (query.status) where.push(`t."status" = ${param(query.status)}`);
    if (query.open) where.push(`t."status" <> 'Completed'`);
    if (query.unassigned) {
      where.push(`EXISTS (SELECT 1 FROM "TaskStage" us
                  WHERE us."taskId" = t."id" AND us."assigneeId" IS NULL AND us."status" <> 'Completed')`);
    }
    if (query.clientId) where.push(`t."clientId" = ${param(query.clientId)}`);
    if (query.assigneeId) {
      where.push(`EXISTS (SELECT 1 FROM "TaskStage" fs
                  WHERE fs."taskId" = t."id" AND fs."assigneeId" = ${param(query.assigneeId)})`);
    }
    if (query.overdue) {
      where.push(`t."dueDate" < (now() AT TIME ZONE ${param(TIME_ZONE)})::date
                  AND t."status" <> 'Completed'`);
    }
    const search = query.search?.trim();
    if (search) {
      const number = /^#?(\d{1,9})$/.exec(search);
      where.push(
        number
          ? `(t."id" = ${param(Number(number[1]))} OR t."title" ILIKE ${param(likeContains(search))})`
          : `t."title" ILIKE ${param(likeContains(search))}`,
      );
    }
    if (query.before) where.push(`t."id" < ${param(query.before)}`);

    const limit = query.limit ?? 50;
    const result = await this.pool.query<TaskListItem>(
      `SELECT t."id", t."title", t."status", t."dueDate", t."archivedAt", t."createdAt",
              json_build_object('id', c."id", 'name', c."name", 'clientCode', c."clientCode") AS "client",
              json_build_object('id', tt."id", 'name', tt."name") AS "taskType",
              progress."total" AS "stagesTotal",
              progress."completed" AS "stagesCompleted",
              current."stage" AS "currentStage"
       FROM "Task" t
       JOIN "Client" c ON c."id" = t."clientId"
       JOIN "TaskType" tt ON tt."id" = t."taskTypeId"
       CROSS JOIN LATERAL (
         SELECT count(*)::int AS "total",
                (count(*) FILTER (WHERE ps."status" = 'Completed'))::int AS "completed"
         FROM "TaskStage" ps WHERE ps."taskId" = t."id"
       ) progress
       LEFT JOIN LATERAL (
         SELECT json_build_object(
                  'position', cs."position", 'name', cs."name", 'status', cs."status",
                  'assignee', CASE WHEN ce."id" IS NULL THEN NULL
                                   ELSE json_build_object('id', ce."id", 'name', ce."name") END
                ) AS "stage"
         FROM "TaskStage" cs
         LEFT JOIN "Employee" ce ON ce."id" = cs."assigneeId"
         WHERE cs."taskId" = t."id" AND cs."status" <> 'Completed'
         ORDER BY cs."position"
         LIMIT 1
       ) current ON TRUE
       WHERE ${where.join(' AND ')}
       ORDER BY t."id" DESC
       LIMIT ${param(limit + 1)}`,
      params,
    );

    const items = result.rows.slice(0, limit);
    return {
      items,
      nextBefore: result.rows.length > limit ? items[items.length - 1].id : null,
    };
  }

  async get(viewer: AuthUser, taskId: number): Promise<TaskDetail> {
    await this.assertVisible(this.pool, viewer, taskId, 'tasks.view');
    return (await loadTaskDetail(this.pool, taskId))!;
  }

  async create(
    viewer: AuthUser,
    data: CreateTaskDto,
    context: AuditContext,
  ): Promise<TaskDetail> {
    const assignees = data.assignees ?? [];
    if (assignees.length && !viewer.permissions['tasks.assign']) {
      throw new ForbiddenException('You do not have permission to assign stages');
    }
    if (new Set(assignees.map((a) => a.position)).size !== assignees.length) {
      throw new BadRequestException('Each stage can have only one assignee');
    }

    return this.transaction(async (db) => {
      // Hold the type steady (an edit takes FOR UPDATE) while its stages
      // are validated and copied.
      await db.query(`SELECT 1 FROM "TaskType" WHERE "id" = $1 FOR SHARE`, [data.taskTypeId]);
      const type = await db.query<{ name: string; isActive: boolean; stages: string[] }>(
        `SELECT t."name", t."isActive",
                COALESCE(array_agg(s."name" ORDER BY s."position") FILTER (WHERE s."id" IS NOT NULL), '{}') AS "stages"
         FROM "TaskType" t
         LEFT JOIN "TaskTypeStage" s ON s."taskTypeId" = t."id"
         WHERE t."id" = $1
         GROUP BY t."id"`,
        [data.taskTypeId],
      );
      const taskType = type.rows[0];
      if (!taskType) throw new BadRequestException('Task type not found');
      if (!taskType.isActive) {
        throw new BadRequestException(`${taskType.name} is inactive and cannot be used for new tasks`);
      }
      if (!taskType.stages.length) {
        throw new BadRequestException(`${taskType.name} has no stages`);
      }
      if (assignees.some((a) => a.position > taskType.stages.length)) {
        throw new BadRequestException(`${taskType.name} has only ${taskType.stages.length} stages`);
      }

      const client = await db.query<{ name: string; isActive: boolean }>(
        `SELECT "name", "isActive" FROM "Client" WHERE "id" = $1 FOR SHARE`,
        [data.clientId],
      );
      if (!client.rows[0]) throw new BadRequestException('Client not found');
      if (!client.rows[0].isActive) {
        throw new BadRequestException(`${client.rows[0].name} is archived`);
      }

      const people = await this.activeEmployees(db, assignees.map((a) => a.employeeId));

      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "Task"
          ("title", "description", "clientId", "taskTypeId", "dueDate", "createdById", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING "id"`,
        [
          data.title.trim(),
          data.description?.trim() || null,
          data.clientId,
          data.taskTypeId,
          data.dueDate ?? null,
          viewer.employeeId,
        ],
      );
      const taskId = inserted.rows[0].id;

      // Copy the type's stages; tasks keep their own copy from now on.
      await db.query(
        `INSERT INTO "TaskStage" ("taskId", "position", "name", "assigneeId", "updatedAt")
         SELECT $1, s."position", s."name", a."employeeId", NOW()
         FROM "TaskTypeStage" s
         LEFT JOIN unnest($3::int[], $4::int[]) AS a("position", "employeeId")
           ON a."position" = s."position"
         WHERE s."taskTypeId" = $2`,
        [
          taskId,
          data.taskTypeId,
          assignees.map((a) => a.position),
          assignees.map((a) => a.employeeId),
        ],
      );

      const task = (await loadTaskDetail(db, taskId))!;
      await this.audit.record(db, context, {
        action: 'task.created',
        entityType: 'Task',
        entityId: taskId,
        summary: `Created ${ref(taskId)} ${task.title} for ${task.client.name}`,
        changes: {
          title: task.title,
          client: task.client.name,
          taskType: task.taskType.name,
          dueDate: task.dueDate,
          stages: task.stages.map((s) => s.name),
          assignees: Object.fromEntries(
            assignees.map((a) => [`${a.position}. ${task.stages[a.position - 1].name}`, people.get(a.employeeId)]),
          ),
        },
      });
      return task;
    });
  }

  async update(
    viewer: AuthUser,
    taskId: number,
    data: UpdateTaskDto,
    context: AuditContext,
  ): Promise<TaskDetail> {
    return this.transaction(async (db) => {
      const current = await this.lockVisible(db, viewer, taskId, 'tasks.edit');
      if (current.archivedAt) throw new BadRequestException('Archived tasks cannot be edited');
      if (current.version !== data.version) {
        throw new ConflictException(
          'Someone else changed this task. Reload it and make your changes again.',
        );
      }

      const next = {
        title: data.title.trim(),
        description: data.description?.trim() || null,
        dueDate: data.dueDate === undefined ? current.dueDate : data.dueDate,
      };
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const field of ['title', 'description', 'dueDate'] as const) {
        if (current[field] !== next[field]) changes[field] = { from: current[field], to: next[field] };
      }
      if (!Object.keys(changes).length) return (await loadTaskDetail(db, taskId))!;

      await db.query(
        `UPDATE "Task"
         SET "title" = $2, "description" = $3, "dueDate" = $4,
             "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [taskId, next.title, next.description, next.dueDate],
      );
      await this.audit.record(db, context, {
        action: 'task.updated',
        entityType: 'Task',
        entityId: taskId,
        summary: `Edited ${ref(taskId)} ${next.title}`,
        changes,
      });
      return (await loadTaskDetail(db, taskId))!;
    });
  }

  async setArchived(
    viewer: AuthUser,
    taskId: number,
    archived: boolean,
    context: AuditContext,
  ): Promise<TaskDetail> {
    return this.transaction(async (db) => {
      const current = await this.lockVisible(db, viewer, taskId, 'tasks.view');
      if (Boolean(current.archivedAt) === archived) return (await loadTaskDetail(db, taskId))!;

      await db.query(
        `UPDATE "Task" SET "archivedAt" = ${archived ? 'NOW()' : 'NULL'}, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [taskId],
      );
      await this.audit.record(db, context, {
        action: archived ? 'task.archived' : 'task.restored',
        entityType: 'Task',
        entityId: taskId,
        summary: `${archived ? 'Archived' : 'Restored'} ${ref(taskId)} ${current.title}`,
      });
      return (await loadTaskDetail(db, taskId))!;
    });
  }

  /** Active people a stage can be handed to. */
  async assignableEmployees(): Promise<(PersonRef & { designation: string })[]> {
    const result = await this.pool.query<PersonRef & { designation: string }>(
      `SELECT "id", "name", "designation" FROM "Employee"
       WHERE "status" = 'Active' ORDER BY lower("name")`,
    );
    return result.rows;
  }

  /** Names of the given employees, failing if any is unknown or inactive. */
  private async activeEmployees(db: PoolClient, ids: number[]): Promise<Map<number, string>> {
    if (!ids.length) return new Map();
    const result = await db.query<{ id: number; name: string }>(
      `SELECT "id", "name" FROM "Employee" WHERE "id" = ANY($1::int[]) AND "status" = 'Active'`,
      [ids],
    );
    if (result.rows.length !== new Set(ids).size) {
      throw new BadRequestException('Stages can only be assigned to active employees');
    }
    return new Map(result.rows.map((row) => [row.id, row.name]));
  }

  private async assertVisible(
    db: Pick<PoolClient, 'query'>,
    viewer: AuthUser,
    taskId: number,
    permission: 'tasks.view' | 'tasks.edit',
  ) {
    const params: unknown[] = [taskId];
    const param = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const found = await db.query(
      `SELECT 1 FROM "Task" t WHERE t."id" = $1 AND ${visibleTo(viewer, permission, param)}`,
      params,
    );
    // Someone else's task looks the same as a missing one.
    if (!found.rowCount) throw new NotFoundException('Task not found');
  }

  private async lockVisible(
    db: PoolClient,
    viewer: AuthUser,
    taskId: number,
    permission: 'tasks.view' | 'tasks.edit',
  ) {
    await this.assertVisible(db, viewer, taskId, permission);
    const locked = await db.query<{
      title: string;
      description: string | null;
      dueDate: string | null;
      archivedAt: Date | null;
      version: number;
    }>(
      `SELECT "title", "description", "dueDate", "archivedAt", "version"
       FROM "Task" WHERE "id" = $1 FOR UPDATE`,
      [taskId],
    );
    return locked.rows[0];
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
        throw new BadRequestException('dueDate is not a valid date');
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

/** The reference number staff search for: 4 → "#0004". */
export function ref(taskId: number): string {
  return `#${String(taskId).padStart(4, '0')}`;
}
