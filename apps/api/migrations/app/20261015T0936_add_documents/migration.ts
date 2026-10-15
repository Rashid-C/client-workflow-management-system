#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/3595b91d77763d673cbf1d4ca39591cb87ebb8105ebaa388e14969b139bb7e65/contract';
import startContract from '../../snapshots/3595b91d77763d673cbf1d4ca39591cb87ebb8105ebaa388e14969b139bb7e65/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9b8cff20ee6f4bb8c0e2da2f475dbf618e06c3c7fcae7cf8920c5feee28c967e/contract';
import endContract from '../../snapshots/9b8cff20ee6f4bb8c0e2da2f475dbf618e06c3c7fcae7cf8920c5feee28c967e/contract.json' with { type: 'json' };
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
        table: 'Document',
        columns: [
          col('archivedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('clientId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('documentNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('expiryDate', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('issueDate', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('reminderDays', 'int4', {
            notNull: true,
            default: lit(30),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('title', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('type', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
            'Document_dates_order_0740a985',
            '"issueDate" IS NULL OR "expiryDate" IS NULL OR "expiryDate" >= "issueDate"',
          ),
          checkExpression(
            'Document_reminderDays_range_92ab7f9b',
            '"reminderDays" BETWEEN 0 AND 365',
          ),
          checkExpression(
            'Document_type_check_efff8b40',
            `"type" IN ('Trade licence', 'VAT certificate', 'Corporate tax certificate', 'ICV certificate', 'ADNOC vendor registration', 'Emirates ID', 'Passport', 'Residence visa', 'Tenancy contract (Ejari)', 'Memorandum of association', 'Power of attorney', 'Other')`,
          ),
        ],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_clientId_idx_153a9a49',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Document',
        index: 'Document_expiryDate_idx_3c770fb2',
        columns: ['expiryDate'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Document',
        foreignKey: {
          name: 'Document_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Document',
        foreignKey: {
          name: 'Document_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
