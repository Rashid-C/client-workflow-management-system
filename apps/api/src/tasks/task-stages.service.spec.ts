import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { TaskStagesService } from './task-stages.service.js';
import type { WorkStatus } from './work-status.js';

type Stage = {
  id: number;
  position: number;
  name: string;
  status: WorkStatus;
  assigneeId: number | null;
  assigneeName: string | null;
};

/**
 * A tiny stand-in for Postgres: answers each query by what it asks for, and
 * records every write, so tests read like the rules they check.
 */
function fakeDatabase(options: {
  stages: Stage[];
  archived?: boolean;
  visible?: boolean;
  activeEmployees?: Record<number, string>;
  minutesAlreadyLogged?: number;
  future?: boolean;
}) {
  const writes: { sql: string; params: unknown[] }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return { rows: [] };
    if (sql.includes('FROM "Task" t') && sql.includes('FOR UPDATE OF t')) {
      return options.visible === false
        ? { rows: [] }
        : { rows: [{ id: 7, title: 'ICV 2026', archivedAt: options.archived ? new Date() : null }] };
    }
    if (sql.includes('FROM "TaskStage" s LEFT JOIN "Employee"')) return { rows: options.stages };
    if (sql.includes('pg_advisory_xact_lock')) return { rows: [] };
    if (sql.includes('"future"')) {
      return {
        rows: [{ day: '2026-10-13', future: options.future ?? false, used: options.minutesAlreadyLogged ?? 0 }],
      };
    }
    if (sql.includes('FROM "Employee" WHERE "id" = $1 AND "status" = \'Active\'')) {
      const name = options.activeEmployees?.[params[0] as number];
      return { rows: name ? [{ name }] : [] };
    }
    if (sql.includes('FROM "Task" t') && sql.includes('JOIN "Client"')) {
      // loadTaskDetail
      return { rows: [{ id: 7, title: 'ICV 2026' }] };
    }
    if (/^\s*(UPDATE|INSERT|DELETE)/.test(sql)) {
      writes.push({ sql, params });
      return { rows: [], rowCount: 1 };
    }
    return { rows: [] };
  });
  return { query, writes };
}

const stage = (
  position: number,
  status: WorkStatus,
  assigneeId: number | null = 3,
): Stage => ({
  id: 100 + position,
  position,
  name: ['Document collection', 'ICV calculation', 'Review'][position - 1],
  status,
  assigneeId,
  assigneeName: assigneeId ? `Person ${assigneeId}` : null,
});

const staff: AuthUser = {
  sessionId: 1,
  employeeId: 3,
  employeeCode: 'EMP-003',
  name: 'Sam Staff',
  email: 'sam@firm.ae',
  isSuperAdmin: false,
  mustChangePassword: false,
  preferredLanguage: 'en',
  permissions: { 'tasks.view': 'own', 'tasks.complete': 'own', 'tasks.assign': 'own' },
};
const manager: AuthUser = {
  ...staff,
  employeeId: 2,
  name: 'Maria Manager',
  permissions: {
    'tasks.view': 'all',
    'tasks.complete': 'all',
    'tasks.assign': 'all',
    'tasks.reopen': 'all',
  },
};
const context: AuditContext = { actor: { employeeId: 3, name: 'Sam Staff' } };

describe('TaskStagesService', () => {
  let record: ReturnType<typeof vi.fn>;

  async function serviceWith(db: ReturnType<typeof fakeDatabase>) {
    record = vi.fn().mockResolvedValue(undefined);
    const connection = { query: db.query, release: vi.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskStagesService,
        {
          provide: POSTGRES_POOL,
          useValue: { query: db.query, connect: vi.fn().mockResolvedValue(connection) },
        },
        { provide: AuditService, useValue: { record } },
      ],
    }).compile();
    return { service: module.get(TaskStagesService), connection };
  }

  const taskStatusWrite = (db: ReturnType<typeof fakeDatabase>) =>
    db.writes.find((w) => w.sql.includes('UPDATE "Task" SET "status"'))?.params[1];

  describe('who may act', () => {
    it('lets staff start a stage assigned to them', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Pending', 3), stage(2, 'Pending')] });
      const { service } = await serviceWith(db);

      await service.start(staff, 7, 1, context);

      expect(db.writes[0].sql).toContain(`"status" = 'In progress'`);
      expect(taskStatusWrite(db)).toBe('In progress');
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'task.stage_started',
        entityType: 'Task',
        entityId: 7,
      });
    });

    it("refuses staff on someone else's stage", async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Pending', 9)] });
      const { service } = await serviceWith(db);

      await expect(service.start(staff, 7, 1, context)).rejects.toThrow(
        'This stage is not assigned to you',
      );
      expect(db.writes).toHaveLength(0);
      expect(record).not.toHaveBeenCalled();
    });

    it('lets a manager act on any stage, even an unassigned one', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Pending', null)] });
      const { service } = await serviceWith(db);

      await expect(service.start(manager, 7, 1, context)).resolves.toBeDefined();
    });

    it('hides tasks the user may not see as missing', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Pending')], visible: false });
      const { service } = await serviceWith(db);

      await expect(service.start(staff, 7, 1, context)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('freezes archived tasks', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Pending')], archived: true });
      const { service } = await serviceWith(db);

      await expect(service.start(manager, 7, 1, context)).rejects.toThrow('Archived tasks cannot change');
    });

    it('requires the reopen permission to reopen', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Completed')] });
      const { service } = await serviceWith(db);

      await expect(
        service.reopen(staff, 7, 1, { comment: 'Missed a document' }, context),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('order', () => {
    it('refuses to start a stage before earlier ones are completed', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'In progress'), stage(2, 'Pending')] });
      const { service } = await serviceWith(db);

      await expect(service.start(manager, 7, 2, context)).rejects.toThrow(
        'Earlier stages must be completed first',
      );
      expect(db.writes).toHaveLength(0);
    });

    it('answers 404 for a stage that does not exist', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Pending')] });
      const { service } = await serviceWith(db);

      await expect(service.start(manager, 7, 9, context)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('complete', () => {
    it('logs the time, hands over the next stage and records both', async () => {
      const db = fakeDatabase({
        stages: [stage(1, 'In progress', 3), stage(2, 'Pending', null)],
        activeEmployees: { 5: 'Alex Associate' },
      });
      const { service } = await serviceWith(db);

      await service.complete(staff, 7, 1, { minutes: 75, comment: 'Docs received', nextAssigneeId: 5 }, context);

      const time = db.writes.find((w) => w.sql.includes('INSERT INTO "TimeEntry"'))!;
      expect(time.params).toEqual([101, 7, 3, '2026-10-13', 75, 'Docs received']);
      expect(db.writes.find((w) => w.sql.includes('"assigneeId" = $2'))!.params).toEqual([102, 5]);
      expect(taskStatusWrite(db)).toBe('In progress');

      const entry = record.mock.calls[0][2];
      expect(entry.summary).toContain('Completed stage 1. Document collection (1h 15m)');
      expect(entry.summary).toContain('handed 2. ICV calculation to Alex Associate');
      expect(entry.reason).toBe('Docs received');
    });

    it('marks the task completed when the last stage completes', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Completed'), stage(2, 'In progress')] });
      const { service } = await serviceWith(db);

      await service.complete(staff, 7, 2, { minutes: 30 }, context);

      expect(taskStatusWrite(db)).toBe('Completed');
    });

    it('refuses more than 24 hours in one day', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'In progress')], minutesAlreadyLogged: 23 * 60 });
      const { service } = await serviceWith(db);

      await expect(service.complete(staff, 7, 1, { minutes: 90 }, context)).rejects.toThrow(
        'a day holds at most 24 hours',
      );
      expect(db.writes.some((w) => w.sql.includes('INSERT INTO "TimeEntry"'))).toBe(false);
    });

    it('refuses time on a future day', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'In progress')], future: true });
      const { service } = await serviceWith(db);

      await expect(
        service.complete(staff, 7, 1, { minutes: 30, workDate: '2099-01-01' }, context),
      ).rejects.toThrow('future date');
    });

    it('refuses a handover to an inactive person', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'In progress'), stage(2, 'Pending')] });
      const { service } = await serviceWith(db);

      await expect(
        service.complete(staff, 7, 1, { minutes: 30, nextAssigneeId: 99 }, context),
      ).rejects.toThrow('active employees');
    });

    it('has no next stage to hand over after the last one', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'In progress')], activeEmployees: { 5: 'Alex' } });
      const { service } = await serviceWith(db);

      await expect(
        service.complete(staff, 7, 1, { minutes: 30, nextAssigneeId: 5 }, context),
      ).rejects.toThrow('last stage');
    });
  });

  describe('block and resume', () => {
    it('stores the reason on the stage and marks the task blocked', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'In progress')] });
      const { service } = await serviceWith(db);

      await service.block(staff, 7, 1, { reason: '  Waiting for bank statements ' }, context);

      const update = db.writes.find((w) => w.sql.includes(`"status" = 'Blocked'`))!;
      expect(update.params).toEqual([101, 'Waiting for bank statements', 3]);
      expect(db.writes.some((w) => w.sql.includes('TimeEntry'))).toBe(false);
      expect(taskStatusWrite(db)).toBe('Blocked');
      expect(record.mock.calls[0][2].reason).toBe('Waiting for bank statements');
    });

    it('refuses a blank reason', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'In progress')] });
      const { service } = await serviceWith(db);

      await expect(service.block(staff, 7, 1, { reason: '   ' }, context)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('clears the block on resume', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Blocked')] });
      const { service } = await serviceWith(db);

      await service.resume(staff, 7, 1, context);

      expect(db.writes[0].sql).toContain('"blockedReason" = NULL');
      expect(taskStatusWrite(db)).toBe('In progress');
    });
  });

  describe('reassign', () => {
    it('needs a comment when taking a stage from someone', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'In progress', 3)], activeEmployees: { 5: 'Alex' } });
      const { service } = await serviceWith(db);

      await expect(
        service.reassign(staff, 7, 1, { assigneeId: 5 }, context),
      ).rejects.toThrow('Add a comment');
    });

    it('assigns an unassigned stage without a comment', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Pending', null)], activeEmployees: { 5: 'Alex' } });
      const { service } = await serviceWith(db);

      await service.reassign(manager, 7, 1, { assigneeId: 5 }, context);

      expect(record.mock.calls[0][2].summary).toContain('Assigned stage 1. Document collection to Alex');
    });

    it('lets staff hand over their own stage, not take others', async () => {
      const db = fakeDatabase({ stages: [stage(1, 'Pending', 9)], activeEmployees: { 3: 'Sam' } });
      const { service } = await serviceWith(db);

      await expect(
        service.reassign(staff, 7, 1, { assigneeId: 3, comment: 'Mine now' }, context),
      ).rejects.toThrow('not assigned to you');
    });
  });

  describe('reopen', () => {
    it('sends later in-progress and blocked stages back to pending', async () => {
      const db = fakeDatabase({
        stages: [stage(1, 'Completed'), stage(2, 'Blocked'), stage(3, 'Pending')],
      });
      const { service } = await serviceWith(db);

      await service.reopen(manager, 7, 1, { comment: 'Wrong trade licence' }, context);

      const reset = db.writes.find((w) => w.sql.includes(`"status" = 'Pending'`))!;
      expect(reset.params).toEqual([7, [2]]);
      expect(taskStatusWrite(db)).toBe('In progress');
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'task.stage_reopened',
        reason: 'Wrong trade licence',
      });
    });
  });
});
