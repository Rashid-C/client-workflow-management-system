#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/c41912bda265bdd08494afd4bf236aff7d4a058778d35ff47cb47c644b66774f/contract';
import endContract from '../../snapshots/c41912bda265bdd08494afd4bf236aff7d4a058778d35ff47cb47c644b66774f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<never, End> {
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createSchema({ schema: 'public' }),
      this.createTable({
        schema: 'public',
        table: 'Client',
        columns: [
          col('address', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('clientCode', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('companyName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_clientCode_key',
        columns: ['clientCode'],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
