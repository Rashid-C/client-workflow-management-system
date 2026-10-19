#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/0341170e5148caf97ea3ae32ca5002518143cfae6d064903d37c34d5253390a0/contract';
import endContract from '../../snapshots/0341170e5148caf97ea3ae32ca5002518143cfae6d064903d37c34d5253390a0/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/57988ab684b65ca73cd48d351fa619ddb505aaa44fe76d911164c19b375a9f64/contract';
import startContract from '../../snapshots/57988ab684b65ca73cd48d351fa619ddb505aaa44fe76d911164c19b375a9f64/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  rawSql,
  col,
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
        table: 'Setting',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('companyName', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('companyNameAr', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('companyTrn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('documentReminderDays', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('version', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('workdayEnd', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workdayStart', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('workingDays', 'jsonb', { notNull: true, codecRef: { codecId: 'pg/jsonb@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'Setting_documentReminderDays_range_fd011ea6',
            '"documentReminderDays" BETWEEN 0 AND 365',
          ),
          checkExpression('Setting_single_row_99dee7f0', '"id" = 1'),
          checkExpression(
            'Setting_workday_format_e04f78ac',
            `"workdayStart" ~ '^[0-2][0-9]:[0-5][0-9]$' AND "workdayEnd" ~ '^[0-2][0-9]:[0-5][0-9]$'`,
          ),
        ],
      }),
      // The one settings row, with the firm's known details; staff change it in Settings.
      rawSql({
        id: 'seed.Setting.defaults',
        label: 'Create the settings row with Al Fath defaults',
        operationClass: 'additive',
        target: { id: 'postgres', details: { schema: 'public', objectType: 'table', name: 'Setting' } },
        precheck: [
          { description: 'ensure the settings row does not exist yet', sql: `SELECT NOT EXISTS (SELECT 1 FROM "public"."Setting") AS "result"` },
        ],
        execute: [
          {
            description: 'insert the defaults (UAE week: Monday to Friday)',
            sql: `INSERT INTO "public"."Setting"
  ("id", "companyName", "email", "phone", "address", "workingDays", "workdayStart", "workdayEnd", "documentReminderDays", "updatedAt")
VALUES (1, 'Al Fath Accounts & Tax Solutions', 'info@alfathuae.com', '+971 58 584 8008',
        'Building No. 33 M04, Defence Road, Al Nahyan, Abu Dhabi, UAE', '[1,2,3,4,5]'::jsonb, '08:30', '17:30', 30, NOW())`,
          },
        ],
        postcheck: [
          { description: 'verify the settings row exists', sql: `SELECT EXISTS (SELECT 1 FROM "public"."Setting" WHERE "id" = 1) AS "result"` },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
