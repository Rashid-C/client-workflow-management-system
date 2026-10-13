#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/4afc11bd33a12efa398e92bcc92a8a4587d93eff540ff2d1412d1949f46f5213/contract';
import endContract from '../../snapshots/4afc11bd33a12efa398e92bcc92a8a4587d93eff540ff2d1412d1949f46f5213/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9c7727b50589c173a443007333d7428f3ef2942b259b30782ce600a9adc82fbc/contract';
import startContract from '../../snapshots/9c7727b50589c173a443007333d7428f3ef2942b259b30782ce600a9adc82fbc/contract.json' with { type: 'json' };
import {
  Migration,
  MigrationCLI,
  checkExpression,
  col,
  fn,
  lit,
  primaryKey,
  rawSql,
} from '@prisma/orm-postgres/migration';

// Starting task types from the Product Overview (slide 7). The Super Admin
// can rename, reorder, extend or deactivate them afterwards.
const SEED_TASK_TYPES = `
  ('Audit', 'Statutory / financial audit engagement'::text, ARRAY[
    'Engagement & planning', 'Document collection', 'Fieldwork',
    'Review', 'Draft report', 'Final report & sign-off']),
  ('Audit + ICV', 'Combined audit and ICV certification', ARRAY[
    'Engagement & planning', 'Document collection', 'Audit fieldwork',
    'ICV calculation', 'Review', 'Final report & ICV certificate']),
  ('ICV', 'In-Country Value certification', ARRAY[
    'Document collection', 'ICV calculation', 'Review', 'Certificate issuance']),
  ('ICV Renewal', NULL, ARRAY[
    'Document collection', 'Client sign-off'])`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'TaskType',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isActive', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
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
      this.createTable({
        schema: 'public',
        table: 'TaskTypeStage',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('position', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('taskTypeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('TaskTypeStage_position_positive_a9ae2887', '"position" >= 1'),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'TaskTypeStage',
        constraint: 'TaskTypeStage_taskTypeId_position_key',
        columns: ['taskTypeId', 'position'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaskType',
        index: 'TaskType_name_lower_key_e40b0be1',
        expression: 'lower(name)',
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'TaskTypeStage',
        index: 'TaskTypeStage_taskTypeId_idx_8cf4fcb0',
        columns: ['taskTypeId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'TaskTypeStage',
        foreignKey: {
          name: 'TaskTypeStage_taskTypeId_fkey',
          columns: ['taskTypeId'],
          references: { schema: 'public', table: 'TaskType', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      rawSql({
        id: 'data.TaskType.seed',
        label: 'Seed the starting task types and their stages',
        operationClass: 'data',
        target: {
          id: 'postgres',
          details: { schema: 'public', objectType: 'table', name: 'TaskType' },
        },
        precheck: [
          {
            description: 'ensure no task types exist yet',
            sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."TaskType") AS "result"',
          },
        ],
        execute: [
          {
            description: 'insert Audit, Audit + ICV, ICV and ICV Renewal with their stages',
            sql: `WITH seed ("name", "description", "stages") AS (VALUES ${SEED_TASK_TYPES}
),
inserted AS (
  INSERT INTO "public"."TaskType" ("name", "description", "updatedAt")
  SELECT "name", "description", now() FROM seed
  RETURNING "id", "name"
)
INSERT INTO "public"."TaskTypeStage" ("taskTypeId", "position", "name")
SELECT i."id", s."position", s."name"
FROM inserted i
JOIN seed ON seed."name" = i."name"
CROSS JOIN LATERAL unnest(seed."stages") WITH ORDINALITY AS s("name", "position")`,
          },
        ],
        postcheck: [
          {
            description: 'verify 4 task types with 18 stages exist',
            sql: `SELECT (SELECT count(*) FROM "public"."TaskType") = 4
  AND (SELECT count(*) FROM "public"."TaskTypeStage") = 18 AS "result"`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
