#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/4afc11bd33a12efa398e92bcc92a8a4587d93eff540ff2d1412d1949f46f5213/contract';
import startContract from '../../snapshots/4afc11bd33a12efa398e92bcc92a8a4587d93eff540ff2d1412d1949f46f5213/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/550b02fb5e30ae28ca1bc059765b3e93be77c801fd37b4957d9520c34ee2cfc8/contract';
import endContract from '../../snapshots/550b02fb5e30ae28ca1bc059765b3e93be77c801fd37b4957d9520c34ee2cfc8/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
} from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Task',
        columns: [
          col('archivedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('clientId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('dueDate', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('Pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('taskTypeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Task_status_check_94a13573',
            `"status" IN ('Pending', 'In progress', 'Completed', 'Blocked')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'TaskStage',
        columns: [
          col('assigneeId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('blockedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('blockedById', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('blockedReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('completedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('startedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('Pending'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('taskId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('TaskStage_position_positive_a9ae2887', '"position" >= 1'),
          checkExpression(
            'TaskStage_status_check_94a13573',
            `"status" IN ('Pending', 'In progress', 'Completed', 'Blocked')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'TimeEntry',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('employeeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('minutes', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('taskId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('taskStageId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('workDate', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('TimeEntry_minutes_range_c582cb6b', '"minutes" BETWEEN 1 AND 720'),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'TaskStage',
        constraint: 'TaskStage_taskId_position_key',
        columns: ['taskId', 'position'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_status_dueDate_idx_ec56e113',
        columns: ['status', 'dueDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Task',
        index: 'Task_taskTypeId_idx_8cf4fcb0',
        columns: ['taskTypeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaskStage',
        index: 'TaskStage_assigneeId_idx_fd12ae38',
        columns: ['assigneeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaskStage',
        index: 'TaskStage_assigneeId_status_idx_80e4cf3c',
        columns: ['assigneeId', 'status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaskStage',
        index: 'TaskStage_blockedById_idx_60a57bcc',
        columns: ['blockedById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaskStage',
        index: 'TaskStage_taskId_idx_4965c936',
        columns: ['taskId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TimeEntry',
        index: 'TimeEntry_employeeId_idx_087dd4a6',
        columns: ['employeeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TimeEntry',
        index: 'TimeEntry_employeeId_workDate_idx_2630e2ab',
        columns: ['employeeId', 'workDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TimeEntry',
        index: 'TimeEntry_taskId_idx_4965c936',
        columns: ['taskId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TimeEntry',
        index: 'TimeEntry_taskStageId_idx_c18cb3d4',
        columns: ['taskStageId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TimeEntry',
        index: 'TimeEntry_workDate_idx_8d1c6484',
        columns: ['workDate'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Task',
        foreignKey: {
          name: 'Task_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Task',
        foreignKey: {
          name: 'Task_taskTypeId_fkey',
          columns: ['taskTypeId'],
          references: { schema: 'public', table: 'TaskType', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Task',
        foreignKey: {
          name: 'Task_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TaskStage',
        foreignKey: {
          name: 'TaskStage_taskId_fkey',
          columns: ['taskId'],
          references: { schema: 'public', table: 'Task', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TaskStage',
        foreignKey: {
          name: 'TaskStage_assigneeId_fkey',
          columns: ['assigneeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TaskStage',
        foreignKey: {
          name: 'TaskStage_blockedById_fkey',
          columns: ['blockedById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TimeEntry',
        foreignKey: {
          name: 'TimeEntry_taskStageId_fkey',
          columns: ['taskStageId'],
          references: { schema: 'public', table: 'TaskStage', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TimeEntry',
        foreignKey: {
          name: 'TimeEntry_taskId_fkey',
          columns: ['taskId'],
          references: { schema: 'public', table: 'Task', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TimeEntry',
        foreignKey: {
          name: 'TimeEntry_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
