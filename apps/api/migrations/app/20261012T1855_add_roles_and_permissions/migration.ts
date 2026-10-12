#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/1cd6492733a9c57d32a3af8086515008b3bac6ac82fcc83832e30b69a776b241/contract';
import startContract from '../../snapshots/1cd6492733a9c57d32a3af8086515008b3bac6ac82fcc83832e30b69a776b241/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/c178a0a39ebca6812b32d8257bc7c81d309116b25578b100e166f190166ba125/contract';
import endContract from '../../snapshots/c178a0a39ebca6812b32d8257bc7c81d309116b25578b100e166f190166ba125/contract.json' with { type: 'json' };
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

const target = (name: string) => ({
  id: 'postgres',
  details: { schema: 'public', objectType: 'table', name },
});

// Default role permissions, following the Product Overview "Default roles"
// table. Super Admin gets no rows: as a system role it implicitly holds every
// permission in apps/api/src/roles/permissions.ts.
const DEFAULT_ROLE_PERMISSIONS = `
  ('Manager', 'dashboard.view', 'all'),
  ('Manager', 'reports.view', 'all'),
  ('Manager', 'clients.view', 'all'),
  ('Manager', 'clients.create', 'all'),
  ('Manager', 'clients.edit', 'all'),
  ('Manager', 'tasks.view', 'all'),
  ('Manager', 'tasks.create', 'all'),
  ('Manager', 'tasks.edit', 'all'),
  ('Manager', 'tasks.assign', 'all'),
  ('Manager', 'tasks.complete', 'all'),
  ('Manager', 'tasks.reopen', 'all'),
  ('Manager', 'employees.view', 'all'),
  ('Manager', 'employees.create', 'all'),
  ('Manager', 'employees.edit', 'all'),
  ('Manager', 'workflows.view', 'all'),
  ('Manager', 'workflows.manage', 'all'),
  ('Manager', 'documents.view', 'all'),
  ('Manager', 'documents.create', 'all'),
  ('Manager', 'documents.edit', 'all'),
  ('Manager', 'time_logs.view', 'all'),
  ('Manager', 'time_logs.create', 'all'),
  ('Manager', 'time_logs.edit', 'all'),
  ('Manager', 'daily_updates.view', 'all'),
  ('Manager', 'daily_updates.create', 'all'),
  ('Manager', 'leads.view', 'all'),
  ('Manager', 'leads.create', 'all'),
  ('Manager', 'leads.edit', 'all'),
  ('Manager', 'roles.view', 'all'),
  ('Manager', 'history.view', 'all'),
  ('Staff', 'dashboard.view', 'all'),
  ('Staff', 'clients.view', 'own'),
  ('Staff', 'tasks.view', 'own'),
  ('Staff', 'tasks.assign', 'own'),
  ('Staff', 'tasks.complete', 'own'),
  ('Staff', 'workflows.view', 'all'),
  ('Staff', 'documents.view', 'own'),
  ('Staff', 'time_logs.view', 'own'),
  ('Staff', 'time_logs.create', 'all'),
  ('Staff', 'daily_updates.view', 'own'),
  ('Staff', 'daily_updates.create', 'all'),
  ('Staff', 'leads.view', 'own'),
  ('Staff', 'leads.edit', 'own')`;

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'EmployeeRole',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('employeeId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('roleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'Role',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('description', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('isSystem', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createTable({
        schema: 'public',
        table: 'RolePermission',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('permissionKey', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('roleId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('scope', 'text', {
            notNull: true,
            default: lit('all'),
            codecRef: { codecId: 'pg/text@1' },
          }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression('RolePermission_scope_check_4253cd73', `"scope" IN ('own', 'all')`),
        ],
      }),
      // Convert the existing YYYY-MM-DD text in place. An invalid value makes
      // the cast fail, which rolls back the whole migration — nothing is lost.
      this.alterColumnType({
        schema: 'public',
        table: 'Employee',
        column: 'joinedDate',
        options: {
          qualifiedTargetType: 'date',
          formatTypeExpected: 'date',
          rawTargetTypeForLabel: 'date',
          using: '"joinedDate"::date',
        },
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Employee',
        constraint: 'Employee_status_check_cf0b2206',
        expression: `"status" IN ('Active', 'Inactive')`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'EmployeeRole',
        constraint: 'EmployeeRole_employeeId_roleId_key',
        columns: ['employeeId', 'roleId'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'RolePermission',
        constraint: 'RolePermission_roleId_permissionKey_key',
        columns: ['roleId', 'permissionKey'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmployeeRole',
        index: 'EmployeeRole_employeeId_idx_087dd4a6',
        columns: ['employeeId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'EmployeeRole',
        index: 'EmployeeRole_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Role',
        index: 'Role_name_lower_key_e40b0be1',
        expression: 'lower(name)',
        extras: { unique: true },
      }),
      this.createIndex({
        schema: 'public',
        table: 'RolePermission',
        index: 'RolePermission_roleId_idx_ffccc9a4',
        columns: ['roleId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EmployeeRole',
        foreignKey: {
          name: 'EmployeeRole_employeeId_fkey',
          columns: ['employeeId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'EmployeeRole',
        foreignKey: {
          name: 'EmployeeRole_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'Role', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'RolePermission',
        foreignKey: {
          name: 'RolePermission_roleId_fkey',
          columns: ['roleId'],
          references: { schema: 'public', table: 'Role', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      rawSql({
        id: 'data.Role.seed',
        label: 'Seed default roles',
        operationClass: 'data',
        target: target('Role'),
        precheck: [
          {
            description: 'ensure no roles exist yet',
            sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."Role") AS "result"',
          },
        ],
        execute: [
          {
            description: 'insert Super Admin, Manager and Staff',
            sql: `INSERT INTO "public"."Role" ("name", "description", "isSystem", "updatedAt")
VALUES
  ('Super Admin', 'Full access to every feature and setting.', true, now()),
  ('Manager', 'Manages clients, tasks, staff and assignments.', false, now()),
  ('Staff', 'Works on the stages assigned to them.', false, now())`,
          },
        ],
        postcheck: [
          {
            description: 'verify the three default roles exist',
            sql: `SELECT count(*) = 3 AS "result" FROM "public"."Role"
WHERE "name" IN ('Super Admin', 'Manager', 'Staff')`,
          },
        ],
      }),
      rawSql({
        id: 'data.RolePermission.seed',
        label: 'Seed default role permissions',
        operationClass: 'data',
        target: target('RolePermission'),
        precheck: [
          {
            description: 'ensure no role permissions exist yet',
            sql: 'SELECT NOT EXISTS (SELECT 1 FROM "public"."RolePermission") AS "result"',
          },
        ],
        execute: [
          {
            description: 'grant Manager and Staff their default permissions',
            sql: `INSERT INTO "public"."RolePermission" ("roleId", "permissionKey", "scope")
SELECT r."id", d."permissionKey", d."scope"
FROM (VALUES ${DEFAULT_ROLE_PERMISSIONS}
) AS d("roleName", "permissionKey", "scope")
JOIN "public"."Role" r ON r."name" = d."roleName"`,
          },
        ],
        postcheck: [
          {
            description: 'verify 42 default permissions were granted',
            sql: 'SELECT count(*) = 42 AS "result" FROM "public"."RolePermission"',
          },
        ],
      }),
      rawSql({
        id: 'data.EmployeeRole.backfill',
        label: 'Copy each employee\'s role into EmployeeRole',
        operationClass: 'data',
        target: target('EmployeeRole'),
        precheck: [
          {
            description: 'ensure every employee role names an existing role',
            sql: `SELECT NOT EXISTS (
  SELECT 1 FROM "public"."Employee" e
  WHERE NOT EXISTS (SELECT 1 FROM "public"."Role" r WHERE r."name" = e."role")
) AS "result"`,
          },
        ],
        execute: [
          {
            description: 'link each employee to the role named in Employee.role',
            sql: `INSERT INTO "public"."EmployeeRole" ("employeeId", "roleId")
SELECT e."id", r."id"
FROM "public"."Employee" e
JOIN "public"."Role" r ON r."name" = e."role"`,
          },
        ],
        postcheck: [
          {
            description: 'verify every employee now has a role',
            sql: `SELECT NOT EXISTS (
  SELECT 1 FROM "public"."Employee" e
  WHERE NOT EXISTS (SELECT 1 FROM "public"."EmployeeRole" er WHERE er."employeeId" = e."id")
) AS "result"`,
          },
        ],
      }),
      // Only now, with every role copied, drop the old text column.
      this.dropColumn({ schema: 'public', table: 'Employee', column: 'role' }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
