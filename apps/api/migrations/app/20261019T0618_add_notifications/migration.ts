#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/00a0b3b4464e776dbcf79a66f6eb5ffd8d5a7b95c0bad4826512181ad0b675ea/contract';
import endContract from '../../snapshots/00a0b3b4464e776dbcf79a66f6eb5ffd8d5a7b95c0bad4826512181ad0b675ea/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/0341170e5148caf97ea3ae32ca5002518143cfae6d064903d37c34d5253390a0/contract';
import startContract from '../../snapshots/0341170e5148caf97ea3ae32ca5002518143cfae6d064903d37c34d5253390a0/contract.json' with { type: 'json' };
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
        table: 'Notification',
        columns: [
          col('body', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('dedupeKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('employeeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('link', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('readAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('title', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Notification_kind_check_65e8c768',
            `"kind" IN ('document_expiring', 'document_expired', 'lead_follow_up_due', 'task_overdue', 'stage_assigned')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'NotificationDigest',
        columns: [
          col('day', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('employeeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('sentAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
        ],
        constraints: [primaryKey(['employeeId', 'day'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'Employee',
        column: col('emailNotificationsEnabled', 'bool', {
          notNull: true,
          default: lit(true),
          codecRef: { codecId: 'pg/bool@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Setting',
        column: col('notificationDigestTime', 'text', {
          notNull: true,
          default: lit('08:00'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addUnique({
        schema: 'public',
        table: 'Notification',
        constraint: 'Notification_employeeId_dedupeKey_key',
        columns: ['employeeId', 'dedupeKey'],
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Setting',
        constraint: 'Setting_notificationDigestTime_format_d03b82a8',
        expression: `"notificationDigestTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'`,
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_employeeId_createdAt_idx_dc1a855e',
        columns: ['employeeId', 'createdAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Notification',
        index: 'Notification_employeeId_idx_087dd4a6',
        columns: ['employeeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'NotificationDigest',
        index: 'NotificationDigest_employeeId_idx_087dd4a6',
        columns: ['employeeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Notification',
        foreignKey: {
          name: 'Notification_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'NotificationDigest',
        foreignKey: {
          name: 'NotificationDigest_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
