#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/57988ab684b65ca73cd48d351fa619ddb505aaa44fe76d911164c19b375a9f64/contract';
import endContract from '../../snapshots/57988ab684b65ca73cd48d351fa619ddb505aaa44fe76d911164c19b375a9f64/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/80dd2aa266a92d9a6a16b51cd43c8d530e171b07ce5739f1eaed31d54d85e31a/contract';
import startContract from '../../snapshots/80dd2aa266a92d9a6a16b51cd43c8d530e171b07ce5739f1eaed31d54d85e31a/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'DailyUpdate',
        columns: [
          col('blockers', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('day', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('done', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('employeeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('plan', 'text', { codecRef: { codecId: 'pg/text@1' } }),
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
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'DailyUpdate',
        constraint: 'DailyUpdate_employeeId_day_key',
        columns: ['employeeId', 'day'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DailyUpdate',
        index: 'DailyUpdate_day_idx_930fcf9b',
        columns: ['day'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'DailyUpdate',
        index: 'DailyUpdate_employeeId_idx_087dd4a6',
        columns: ['employeeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'DailyUpdate',
        foreignKey: {
          name: 'DailyUpdate_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
