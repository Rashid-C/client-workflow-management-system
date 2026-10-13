#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/600ea0208e4b319d2d9d503a6e81da2da4a1c6384715fb091cfe7ce72bb67ccb/contract';
import startContract from '../../snapshots/600ea0208e4b319d2d9d503a6e81da2da4a1c6384715fb091cfe7ce72bb67ccb/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/9c7727b50589c173a443007333d7428f3ef2942b259b30782ce600a9adc82fbc/contract';
import endContract from '../../snapshots/9c7727b50589c173a443007333d7428f3ef2942b259b30782ce600a9adc82fbc/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'AuditLog',
        columns: [
          col('action', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('actorEmployeeId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('actorName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('changes', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('entityId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('entityType', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('ipAddress', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('occurredAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('reason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('summary', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('userAgent', 'text', { codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_actorEmployeeId_id_idx_4bfd4920',
        columns: ['actorEmployeeId', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_actorEmployeeId_idx_d564fedd',
        columns: ['actorEmployeeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_entityType_entityId_id_idx_2f03149c',
        columns: ['entityType', 'entityId', 'id'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'AuditLog',
        index: 'AuditLog_occurredAt_idx_c6b89167',
        columns: ['occurredAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'AuditLog',
        foreignKey: {
          name: 'AuditLog_actorEmployeeId_fkey',
          columns: ['actorEmployeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      // History is evidence: once written, an entry can never be changed or
      // removed, whatever the application code does.
      rawSql({
        id: 'trigger.AuditLog.appendOnly',
        label: 'Make "AuditLog" append-only',
        operationClass: 'additive',
        target: {
          id: 'postgres',
          details: { schema: 'public', objectType: 'table', name: 'AuditLog' },
        },
        precheck: [
          {
            description: 'ensure the append-only function does not exist yet',
            sql: `SELECT to_regprocedure('public."AuditLog_reject_change"()') IS NULL AS "result"`,
          },
        ],
        execute: [
          {
            description: 'create the function that rejects changes',
            sql: `CREATE FUNCTION "public"."AuditLog_reject_change"() RETURNS trigger
LANGUAGE plpgsql AS $body$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$body$`,
          },
          {
            description: 'reject UPDATE and DELETE on every row',
            sql: `CREATE TRIGGER "AuditLog_append_only"
BEFORE UPDATE OR DELETE ON "public"."AuditLog"
FOR EACH ROW EXECUTE FUNCTION "public"."AuditLog_reject_change"()`,
          },
          {
            description: 'reject TRUNCATE of the whole table',
            sql: `CREATE TRIGGER "AuditLog_no_truncate"
BEFORE TRUNCATE ON "public"."AuditLog"
FOR EACH STATEMENT EXECUTE FUNCTION "public"."AuditLog_reject_change"()`,
          },
        ],
        postcheck: [
          {
            description: 'verify both append-only triggers exist',
            sql: `SELECT count(*) = 2 AS "result" FROM pg_trigger
WHERE tgrelid = '"public"."AuditLog"'::regclass
  AND tgname IN ('AuditLog_append_only', 'AuditLog_no_truncate')`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
