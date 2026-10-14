#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/8045fff9643ff004e4c768087ed0142d2dce8c94df6786c1a33a4c2aa4270796/contract';
import startContract from '../../snapshots/8045fff9643ff004e4c768087ed0142d2dce8c94df6786c1a33a4c2aa4270796/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/dfebfa55f371304fa5cc9c08b9072370bae7890cfa152276bd92f0236229d907/contract';
import endContract from '../../snapshots/dfebfa55f371304fa5cc9c08b9072370bae7890cfa152276bd92f0236229d907/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit, rawSql } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('accountManagerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('businessActivity', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('contactDesignation', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('contactEmail', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('contactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('contactPhone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('corporateTaxTrn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('emirate', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('entityType', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('financialYearEndMonth', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('freeZone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('jurisdiction', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('legalNameAr', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('licenseAuthority', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('tradeLicenseNumber', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('vatTrn', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Client',
        column: col('version', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_corporateTaxTrn_format_dd6b5e2a',
        expression: `"corporateTaxTrn" ~ '^[0-9]{15}$'`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_emirate_check_76468c4c',
        expression: `"emirate" IN ('Abu Dhabi', 'Dubai', 'Sharjah', 'Ajman', 'Umm Al Quwain', 'Ras Al Khaimah', 'Fujairah')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_entityType_check_a03b0a15',
        expression: `"entityType" IN ('LLC', 'Sole establishment', 'Civil company', 'Branch', 'Joint stock company', 'Partnership', 'Individual', 'Other')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_financialYearEndMonth_range_b33452a5',
        expression: '"financialYearEndMonth" BETWEEN 1 AND 12',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_jurisdiction_check_bb15cdfa',
        expression: `"jurisdiction" IN ('Mainland', 'Free zone', 'Offshore')`,
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_vatTrn_format_0235a5e8',
        expression: `"vatTrn" ~ '^[0-9]{15}$'`,
      }),
      this.addUnique({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_corporateTaxTrn_key',
        columns: ['corporateTaxTrn'],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Client',
        constraint: 'Client_vatTrn_key',
        columns: ['vatTrn'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Client',
        index: 'Client_accountManagerId_idx_2dca74d4',
        columns: ['accountManagerId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Client',
        foreignKey: {
          name: 'Client_accountManagerId_fkey',
          columns: ['accountManagerId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      // The API issues client codes (CL-0001, …) from this sequence, so two
      // people adding clients at once never get the same code.
      rawSql({
        id: 'sequence.Client.code',
        label: 'Create "Client_code_seq" for client codes',
        operationClass: 'additive',
        target: {
          id: 'postgres',
          details: { schema: 'public', objectType: 'table', name: 'Client' },
        },
        precheck: [
          {
            description: 'ensure the client code sequence does not exist yet',
            sql: `SELECT to_regclass('public."Client_code_seq"') IS NULL AS "result"`,
          },
        ],
        execute: [
          {
            description: 'create the client code sequence',
            sql: `CREATE SEQUENCE "public"."Client_code_seq" AS integer START 1`,
          },
          {
            description: 'continue after any CL-n code that already exists',
            sql: `SELECT setval('"public"."Client_code_seq"',
  COALESCE((SELECT max(substring("clientCode" from 4)::int) FROM "public"."Client"
            WHERE "clientCode" ~ '^CL-[0-9]{1,9}$'), 0) + 1, false)`,
          },
        ],
        postcheck: [
          {
            description: 'verify the client code sequence exists',
            sql: `SELECT to_regclass('public."Client_code_seq"') IS NOT NULL AS "result"`,
          },
        ],
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
