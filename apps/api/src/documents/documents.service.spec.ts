import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { DocumentsService, type DocumentRecord } from './documents.service.js';

const context: AuditContext = { actor: { employeeId: 4, name: 'Sam' }, ipAddress: '10.0.0.5' };
const viewer = (view: 'own' | 'all', edit?: 'own' | 'all'): AuthUser => ({
  sessionId: 1,
  employeeId: 4,
  employeeCode: 'EMP-004',
  name: 'Sam',
  email: 'sam@firm.ae',
  isSuperAdmin: false,
  mustChangePassword: false,
  preferredLanguage: 'en',
  emailNotificationsEnabled: true,
  permissions: { 'documents.view': view, ...(edit ? { 'documents.edit': edit } : {}) },
});

const licence: DocumentRecord = {
  id: 5,
  client: { id: 7, name: 'Gulf Trading', clientCode: 'CL-0007' },
  type: 'Trade licence',
  title: null,
  documentNumber: 'CN-123',
  issueDate: '2025-11-01',
  expiryDate: '2026-11-01',
  reminderDays: 30,
  notes: null,
  status: 'Expiring soon',
  daysLeft: 17,
  createdBy: { id: 4, name: 'Sam' },
  version: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function fakeDatabase(options: { visible?: boolean; allowed?: boolean; client?: { name: string; isActive: boolean } | null } = {}) {
  const writes: { sql: string; params: unknown[] }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return {};
    if (sql.includes('"documentReminderDays" FROM "Setting"')) return { rows: [{ days: 45 }] };
    if (sql.includes('AS "visible"')) {
      return { rows: options.visible === false ? [] : [{ visible: true, allowed: options.allowed ?? true }] };
    }
    if (sql.includes('c."isActive" FROM "Client"')) {
      const client = options.client === undefined ? { name: 'Gulf Trading', isActive: true } : options.client;
      return { rows: client ? [client] : [] };
    }
    if (/^(INSERT|UPDATE)/.test(sql.trim())) {
      writes.push({ sql, params });
      return { rows: [{ id: 5 }] };
    }
    if (sql.includes('FROM "Document" d')) return { rows: [licence] };
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { query, release: vi.fn(), writes };
}

async function serviceWith(db: ReturnType<typeof fakeDatabase>) {
  const record = vi.fn().mockResolvedValue(undefined);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      DocumentsService,
      { provide: POSTGRES_POOL, useValue: { query: db.query, connect: vi.fn().mockResolvedValue(db) } },
      { provide: AuditService, useValue: { record } },
    ],
  }).compile();
  return { service: module.get(DocumentsService), record };
}

const edit = (changes = {}) => ({
  clientId: 7,
  type: 'Trade licence' as const,
  documentNumber: 'CN-123',
  issueDate: '2025-11-01',
  expiryDate: '2026-11-01',
  reminderDays: 30,
  version: 2,
  ...changes,
});

describe('DocumentsService', () => {
  it('works out expiry in office time and lists problems first', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await service.list(viewer('all'), { status: 'Expired' });

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain(`(now() AT TIME ZONE 'Asia/Dubai')::date`);
    expect(sql).toContain('d."archivedAt" IS NULL');
    expect(sql).toMatch(/ORDER BY CASE/);
    expect(params).toEqual(['Expired']);
  });

  it('limits "own" to documents of the viewer’s clients', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await service.list(viewer('own'), {});

    expect(db.query.mock.calls[0][0]).toContain('c."accountManagerId" = $1');
  });

  it('filters dashboard attention links to expired and expiring documents', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await service.list(viewer('all'), { status: 'attention' });

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("IN ('Expired', 'Expiring soon')");
    expect(params).toEqual([]);
  });

  it('refuses an expiry before the issue date without writing', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await expect(
      service.create(viewer('all'), { ...edit({ expiryDate: '2025-01-01' }) }, context),
    ).rejects.toMatchObject({ response: { code: 'documents.invalid_dates' } });
    expect(db.writes).toEqual([]);
  });

  it('takes the reminder days from Settings when the form leaves them out', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    const { reminderDays: _, ...withoutReminder } = edit();
    await service.create(viewer('all'), withoutReminder, context);

    const insert = db.writes.find((w) => w.sql.includes('INSERT INTO "Document"'))!;
    expect(insert.params[6]).toBe(45); // FIELDS order: … expiryDate, reminderDays
  });

  it('refuses a document for an archived client', async () => {
    const db = fakeDatabase({ client: { name: 'Old Co', isActive: false } });
    const { service, record } = await serviceWith(db);

    await expect(service.create(viewer('all'), edit(), context)).rejects.toMatchObject({
      response: { code: 'documents.client_archived', params: { name: 'Old Co' } },
    });
    expect(db.writes).toEqual([]);
    expect(record).not.toHaveBeenCalled();
  });

  it('records who added it and the details, in one transaction', async () => {
    const db = fakeDatabase();
    const { service, record } = await serviceWith(db);

    await service.create(viewer('all'), edit(), context);

    expect(db.writes[0].params.at(-1)).toBe(4); // createdById
    expect(record.mock.calls[0][2]).toMatchObject({
      action: 'document.created',
      changes: { type: 'Trade licence', client: 'Gulf Trading', expiryDate: '2026-11-01' },
    });
    expect(db.query.mock.calls.at(-1)![0]).toBe('COMMIT');
  });

  it('records only what changed on edit', async () => {
    const db = fakeDatabase();
    const { service, record } = await serviceWith(db);

    await service.update(viewer('all', 'all'), 5, edit({ expiryDate: '2027-11-01' }), context);

    expect(record.mock.calls[0][2].changes).toEqual({ expiryDate: { from: '2026-11-01', to: '2027-11-01' } });
  });

  it('refuses an edit based on an old version', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await expect(service.update(viewer('all', 'all'), 5, edit({ version: 1, notes: 'x' }), context)).rejects.toMatchObject({
      response: { code: 'documents.stale' },
    });
    expect(db.writes).toEqual([]);
  });

  it('hides documents outside the scope and forbids view-only edits', async () => {
    const hidden = fakeDatabase({ visible: false });
    await expect((await serviceWith(hidden)).service.update(viewer('own', 'own'), 5, edit(), context)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    const viewOnly = fakeDatabase({ allowed: false });
    await expect((await serviceWith(viewOnly)).service.update(viewer('all', 'own'), 5, edit(), context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('archives on delete and keeps the record', async () => {
    const db = fakeDatabase();
    const { service, record } = await serviceWith(db);

    await service.remove(viewer('all'), 5, context);

    expect(db.writes[0].sql).toContain('SET "archivedAt" = NOW()');
    expect(record.mock.calls[0][2]).toMatchObject({ action: 'document.deleted', entityId: 5 });
  });
});
