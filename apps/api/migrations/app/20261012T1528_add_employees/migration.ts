#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/1cd6492733a9c57d32a3af8086515008b3bac6ac82fcc83832e30b69a776b241/contract';
import endContract from '../../snapshots/1cd6492733a9c57d32a3af8086515008b3bac6ac82fcc83832e30b69a776b241/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c41912bda265bdd08494afd4bf236aff7d4a058778d35ff47cb47c644b66774f/contract';
import startContract from '../../snapshots/c41912bda265bdd08494afd4bf236aff7d4a058778d35ff47cb47c644b66774f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Employee',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('designation', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('email', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('employeeCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('joinedDate', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('role', 'text', {
            notNull: true,
            default: lit('Staff'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('status', 'text', {
            notNull: true,
            default: lit('Active'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Employee',
        constraint: 'Employee_employeeCode_key',
        columns: ['employeeCode'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Employee',
        constraint: 'Employee_email_key',
        columns: ['email'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
