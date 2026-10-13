import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { CreateTaskTypeDto, UpdateTaskTypeDto } from './dto.js';

export interface TaskTypeStage {
  position: number;
  name: string;
}

export interface TaskType {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  /** Tasks created from this type, archived ones included. */
  taskCount: number;
  stages: TaskTypeStage[];
}

// Types with their ordered stages in one query.
const SELECT_TASK_TYPES = `
  SELECT t."id", t."name", t."description", t."isActive", t."version",
         (SELECT count(*)::int FROM "Task" k WHERE k."taskTypeId" = t."id") AS "taskCount",
         COALESCE(
           json_agg(
             json_build_object('position', s."position", 'name', s."name")
             ORDER BY s."position"
           ) FILTER (WHERE s."id" IS NOT NULL),
           '[]'
         ) AS "stages"
  FROM "TaskType" t
  LEFT JOIN "TaskTypeStage" s ON s."taskTypeId" = t."id"`;

@Injectable()
export class TaskTypesService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async findAll(includeInactive = false): Promise<TaskType[]> {
    const result = await this.pool.query<TaskType>(
      `${SELECT_TASK_TYPES}
       ${includeInactive ? '' : 'WHERE t."isActive"'}
       GROUP BY t."id"
       ORDER BY t."isActive" DESC, lower(t."name")`,
    );
    return result.rows;
  }

  async findOne(id: number): Promise<TaskType> {
    const type = await this.findById(this.pool, id);
    if (!type) throw new NotFoundException('Task type not found');
    return type;
  }

  async create(data: CreateTaskTypeDto, context: AuditContext): Promise<TaskType> {
    const fields = normalize(data);

    return this.transaction(async (db) => {
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "TaskType" ("name", "description", "updatedAt")
         VALUES ($1, $2, NOW())
         RETURNING "id"`,
        [fields.name, fields.description],
      );
      const id = inserted.rows[0].id;
      await this.insertStages(db, id, fields.stages);

      const type = (await this.findById(db, id))!;
      await this.audit.record(db, context, {
        action: 'task_type.created',
        entityType: 'TaskType',
        entityId: id,
        summary: `Created task type ${type.name} with ${type.stages.length} stages`,
        changes: {
          name: type.name,
          description: type.description,
          stages: type.stages.map((stage) => stage.name),
        },
      });
      return type;
    });
  }

  async update(
    id: number,
    data: UpdateTaskTypeDto,
    context: AuditContext,
  ): Promise<TaskType> {
    const fields = normalize(data);

    return this.transaction(async (db) => {
      const locked = await db.query(
        `SELECT 1 FROM "TaskType" WHERE "id" = $1 FOR UPDATE`,
        [id],
      );
      if (!locked.rowCount) throw new NotFoundException('Task type not found');

      const current = (await this.findById(db, id))!;
      if (current.version !== data.version) {
        throw new ConflictException(
          'Someone else changed this task type. Reload it and make your changes again.',
        );
      }

      const before = current.stages.map((stage) => stage.name);
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      if (current.name !== fields.name) changes.name = { from: current.name, to: fields.name };
      if (current.description !== fields.description) {
        changes.description = { from: current.description, to: fields.description };
      }
      if (current.isActive !== data.isActive) {
        changes.isActive = { from: current.isActive, to: data.isActive };
      }
      if (before.join('\u0000') !== fields.stages.join('\u0000')) {
        changes.stages = { from: before, to: fields.stages };
      }

      // Saving without changes neither bumps the version nor writes history.
      if (Object.keys(changes).length === 0) return current;

      await db.query(
        `UPDATE "TaskType"
         SET "name" = $2, "description" = $3, "isActive" = $4,
             "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [id, fields.name, fields.description, data.isActive],
      );

      if (changes.stages) {
        // Tasks keep their own copies, so the list can simply be replaced.
        await db.query(`DELETE FROM "TaskTypeStage" WHERE "taskTypeId" = $1`, [id]);
        await this.insertStages(db, id, fields.stages);
      }

      const type = (await this.findById(db, id))!;
      await this.audit.record(db, context, {
        action: 'task_type.updated',
        entityType: 'TaskType',
        entityId: id,
        summary:
          changes.isActive && !data.isActive
            ? `Deactivated task type ${type.name}`
            : changes.isActive && data.isActive
              ? `Reactivated task type ${type.name}`
              : `Updated task type ${type.name}`,
        changes,
      });
      return type;
    });
  }

  /**
   * Delete an unused type. A type that tasks were made from is deactivated
   * instead, so those tasks keep pointing at a real type.
   */
  async remove(
    id: number,
    context: AuditContext,
  ): Promise<{ deleted: boolean; taskType: TaskType | null }> {
    return this.transaction(async (db) => {
      const locked = await db.query(
        `SELECT 1 FROM "TaskType" WHERE "id" = $1 FOR UPDATE`,
        [id],
      );
      if (!locked.rowCount) throw new NotFoundException('Task type not found');
      const current = (await this.findById(db, id))!;

      if (current.taskCount > 0) {
        if (current.isActive) {
          await db.query(
            `UPDATE "TaskType" SET "isActive" = false, "version" = "version" + 1, "updatedAt" = NOW()
             WHERE "id" = $1`,
            [id],
          );
          await this.audit.record(db, context, {
            action: 'task_type.updated',
            entityType: 'TaskType',
            entityId: id,
            summary: `Deactivated task type ${current.name} instead of deleting it (used by ${current.taskCount} tasks)`,
            changes: { isActive: { from: true, to: false } },
          });
        }
        return { deleted: false, taskType: (await this.findById(db, id))! };
      }

      // Its stages go with it (ON DELETE CASCADE).
      await db.query(`DELETE FROM "TaskType" WHERE "id" = $1`, [id]);
      await this.audit.record(db, context, {
        action: 'task_type.deleted',
        entityType: 'TaskType',
        entityId: id,
        summary: `Deleted task type ${current.name}`,
        changes: {
          name: current.name,
          description: current.description,
          stages: current.stages.map((stage) => stage.name),
        },
      });
      return { deleted: true, taskType: null };
    });
  }

  private async insertStages(db: PoolClient, taskTypeId: number, stages: string[]) {
    await db.query(
      `INSERT INTO "TaskTypeStage" ("taskTypeId", "position", "name")
       SELECT $1, s."position", s."name"
       FROM unnest($2::text[]) WITH ORDINALITY AS s("name", "position")`,
      [taskTypeId, stages],
    );
  }

  private async findById(
    db: Pick<PoolClient, 'query'>,
    id: number,
  ): Promise<TaskType | undefined> {
    const result = await db.query<TaskType>(
      `${SELECT_TASK_TYPES} WHERE t."id" = $1 GROUP BY t."id"`,
      [id],
    );
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
      if ((error as { code?: string }).code === '23505') {
        throw new ConflictException('A task type with this name already exists');
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

/** Trim names, reject blank or repeated stages, store an empty description as null. */
function normalize(data: CreateTaskTypeDto) {
  const name = data.name.trim();
  const stages = data.stages.map((stage) => stage.trim());

  if (!name) throw new BadRequestException('Name is required');
  if (stages.some((stage) => !stage)) {
    throw new BadRequestException('Stage names cannot be blank');
  }
  const seen = new Set<string>();
  for (const stage of stages) {
    const key = stage.toLowerCase();
    if (seen.has(key)) {
      throw new BadRequestException(`Stage "${stage}" appears more than once`);
    }
    seen.add(key);
  }

  return { name, description: data.description?.trim() || null, stages };
}
