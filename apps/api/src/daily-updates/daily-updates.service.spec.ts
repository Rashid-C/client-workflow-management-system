import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { DailyUpdatesService } from './daily-updates.service.js';

const context: AuditContext = { actor: { employeeId: 4, name: 'Sam' }, ipAddress: '10.0.0.5' };
const viewer = (scope: 'own' | 'all' = 'own'): AuthUser => ({
  sessionId: 1,
  employeeId: 4,
  employeeCode: 'EMP-004',
  name: 'Sam',
  email: 'sam@firm.ae',
  isSuperAdmin: false,
  mustChangePassword: false,
  preferredLanguage: 'en',
  emailNotificationsEnabled: true,
  permissions: { 'daily_updates.view': scope, 'daily_updates.create': 'all' },
});

function fakeDatabase(existing?: { id: number; done: string; plan: string | null; blockers: string | null; version: number }) {
  const writes: { sql: string; params: unknown[] }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return {};
    if (sql.includes('AS "day"')) return { rows: [{ day: '2026-10-15' }] };
    if (sql.includes('FOR UPDATE')) return { rows: existing ? [existing] : [] };
    if (/^(INSERT|UPDATE)/.test(sql.trim())) {
      writes.push({ sql, params });
      return { rows: [{ id: 9 }] };
    }
    if (sql.includes('FROM "DailyUpdate" u')) return { rows: [{ id: 9 }] };
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { query, release: vi.fn(), writes };
}

async function serviceWith(db: ReturnType<typeof fakeDatabase>) {
  const record = vi.fn().mockResolvedValue(undefined);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DailyUpdatesService,
      { provide: POSTGRES_POOL, useValue: { query: db.query, connect: vi.fn().mockResolvedValue(db) } },
      { provide: AuditService, useValue: { record } },
    ],
  }).compile();
  return { service: module.get(DailyUpdatesService), record };
}

describe('DailyUpdatesService', () => {
  it('posts the first update of the day for the office date', async () => {
    const db = fakeDatabase();
    const { service, record } = await serviceWith(db);

    await service.saveToday(viewer(), { done: 'Filed VAT for Gulf Trading' }, context);

    expect(db.writes[0].params).toEqual([4, '2026-10-15', 'Filed VAT for Gulf Trading', null, null]);
    expect(record.mock.calls[0][2]).toMatchObject({ action: 'daily_update.posted' });
  });

  it('edits today’s update and records only what changed', async () => {
    const db = fakeDatabase({ id: 9, done: 'Filed VAT', plan: null, blockers: null, version: 1 });
    const { service, record } = await serviceWith(db);

    await service.saveToday(viewer(), { done: 'Filed VAT', plan: 'Start the audit', version: 1 }, context);

    expect(record.mock.calls[0][2]).toMatchObject({
      action: 'daily_update.edited',
      changes: { plan: { from: null, to: 'Start the audit' } },
    });
  });

  it.each([
    ['an edit based on an old version', { id: 9, done: 'x', plan: null, blockers: null, version: 2 }, 1],
    ['a "first post" when one already exists', { id: 9, done: 'x', plan: null, blockers: null, version: 1 }, undefined],
    ['an edit of a post that does not exist', undefined, 1],
  ])('refuses %s', async (_, existing, version) => {
    const db = fakeDatabase(existing);
    const { service } = await serviceWith(db);

    await expect(service.saveToday(viewer(), { done: 'y', version }, context)).rejects.toBeInstanceOf(ConflictException);
    expect(db.writes).toEqual([]);
  });

  it('shows "own" viewers only their own updates', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await service.list(viewer('own'), { employeeId: 7 });

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('u."employeeId" = $1 AND u."employeeId" = $2');
    expect(params).toEqual([4, 7]);
  });

  it('keeps the "who has not posted" list to team viewers', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await expect(service.missing(viewer('own'), undefined)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
