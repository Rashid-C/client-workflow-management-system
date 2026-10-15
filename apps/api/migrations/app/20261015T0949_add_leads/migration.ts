#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/80dd2aa266a92d9a6a16b51cd43c8d530e171b07ce5739f1eaed31d54d85e31a/contract';
import endContract from '../../snapshots/80dd2aa266a92d9a6a16b51cd43c8d530e171b07ce5739f1eaed31d54d85e31a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/9b8cff20ee6f4bb8c0e2da2f475dbf618e06c3c7fcae7cf8920c5feee28c967e/contract';
import startContract from '../../snapshots/9b8cff20ee6f4bb8c0e2da2f475dbf618e06c3c7fcae7cf8920c5feee28c967e/contract.json' with { type: 'json' };
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
        table: 'Lead',
        columns: [
          col('archivedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-string@1' } }),
          col('clientId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('contactName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('email', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('estimatedValue', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('lostReason', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('nextFollowUpDate', 'date', { codecRef: { codecId: 'pg/date-string@1' } }),
          col('notes', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('ownerId', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
          col('phone', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('services', 'jsonb', { codecRef: { codecId: 'pg/jsonb@1' } }),
          col('source', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('status', 'text', {
            notNull: true,
            default: lit('New'),
            codecRef: { codecId: 'pg/text@1' },
          }),
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
            'Lead_estimatedValue_positive_43df6c00',
            '"estimatedValue" IS NULL OR "estimatedValue" >= 0',
          ),
          checkExpression(
            'Lead_source_check_8427dcce',
            `"source" IN ('Referral', 'Website', 'Walk-in', 'Phone', 'Social media', 'Other')`,
          ),
          checkExpression(
            'Lead_status_check_5a2d3934',
            `"status" IN ('New', 'Contacted', 'Proposal sent', 'Won', 'Lost')`,
          ),
        ],
      }),
      this.createTable({
        schema: 'public',
        table: 'LeadFollowUp',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-string@1' },
          }),
          col('createdById', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('happenedOn', 'date', { notNull: true, codecRef: { codecId: 'pg/date-string@1' } }),
          col('id', 'SERIAL', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('kind', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('leadId', 'int4', { notNull: true, codecRef: { codecId: 'pg/int4@1' } }),
          col('note', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [
          primaryKey(['id']),
          checkExpression(
            'LeadFollowUp_kind_check_3dd42a5e',
            `"kind" IN ('Call', 'Meeting', 'Email', 'WhatsApp', 'Other')`,
          ),
        ],
      }),
      this.addUnique({
        schema: 'public',
        table: 'Lead',
        constraint: 'Lead_clientId_key',
        columns: ['clientId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_nextFollowUpDate_idx_dc0d38d3',
        columns: ['nextFollowUpDate'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_ownerId_idx_e2d0c1ef',
        columns: ['ownerId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Lead',
        index: 'Lead_status_idx_e98638ab',
        columns: ['status'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadFollowUp',
        index: 'LeadFollowUp_createdById_idx_8bf640ed',
        columns: ['createdById'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadFollowUp',
        index: 'LeadFollowUp_leadId_happenedOn_idx_afc432a4',
        columns: ['leadId', 'happenedOn'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'LeadFollowUp',
        index: 'LeadFollowUp_leadId_idx_9113844c',
        columns: ['leadId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_ownerId_fkey',
          columns: ['ownerId'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_clientId_fkey',
          columns: ['clientId'],
          references: { schema: 'public', table: 'Client', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Lead',
        foreignKey: {
          name: 'Lead_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadFollowUp',
        foreignKey: {
          name: 'LeadFollowUp_leadId_fkey',
          columns: ['leadId'],
          references: { schema: 'public', table: 'Lead', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'LeadFollowUp',
        foreignKey: {
          name: 'LeadFollowUp_createdById_fkey',
          columns: ['createdById'],
          references: { schema: 'public', table: 'Employee', columns: ['id'] },
          onDelete: 'restrict',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
