import { BadRequestException, ConflictException, Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { UpdateSettingsDto } from './dto.js';

export interface Settings {
  companyName: string;
  companyNameAr: string | null;
  companyTrn: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  workingDays: number[];
  workdayStart: string;
  workdayEnd: string;
  documentReminderDays: number;
  notificationDigestTime: string;
  version: number;
  updatedAt: Date;
}

const FIELDS = [
  'companyName',
  'companyNameAr',
  'companyTrn',
  'email',
  'phone',
  'address',
  'workingDays',
  'workdayStart',
  'workdayEnd',
  'documentReminderDays',
  'notificationDigestTime',
] as const;

const SELECT = `SELECT ${FIELDS.map((f) => `"${f}"`).join(', ')}, "version", "updatedAt" FROM "Setting" WHERE "id" = 1`;

@Injectable()
export class SettingsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async get(): Promise<Settings> {
    return (await this.pool.query<Settings>(SELECT)).rows[0];
  }

  async update(data: UpdateSettingsDto, context: AuditContext): Promise<Settings> {
    if (data.workdayEnd <= data.workdayStart) {
      throw new BadRequestException(problem('settings.invalid_hours', 'The working day must end after it starts'));
    }
    const next = {
      companyName: data.companyName,
      companyNameAr: data.companyNameAr ?? null,
      companyTrn: data.companyTrn ?? null,
      email: data.email?.toLowerCase() ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      workingDays: [...data.workingDays].sort((a, b) => a - b),
      workdayStart: data.workdayStart,
      workdayEnd: data.workdayEnd,
      documentReminderDays: data.documentReminderDays,
      notificationDigestTime: data.notificationDigestTime,
    };

    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      const current = (await connection.query<Settings>(`${SELECT} FOR UPDATE`)).rows[0];
      if (current.version !== data.version) {
        throw new ConflictException(
          problem('settings.stale', 'Someone else changed the settings. Reload them and make your changes again.'),
        );
      }
      const changes: Record<string, { from: unknown; to: unknown }> = {};
      for (const field of FIELDS) {
        if (JSON.stringify(current[field]) !== JSON.stringify(next[field])) {
          changes[field] = { from: current[field], to: next[field] };
        }
      }
      if (Object.keys(changes).length) {
        await connection.query(
          `UPDATE "Setting" SET ${FIELDS.map((f, i) => `"${f}" = $${i + 1}`).join(', ')},
                  "version" = "version" + 1, "updatedAt" = NOW()
           WHERE "id" = 1`,
          FIELDS.map((f) => (f === 'workingDays' ? JSON.stringify(next[f]) : next[f])),
        );
        await this.audit.record(connection, context, {
          action: 'settings.updated',
          entityType: 'Setting',
          entityId: 1,
          summary: 'Changed the firm settings',
          changes,
        });
      }
      const saved = (await connection.query<Settings>(SELECT)).rows[0];
      await connection.query('COMMIT');
      return saved;
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
}
