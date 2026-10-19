import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { ClientsService } from '../clients/clients.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { LeadsService, type LeadDetail } from './leads.service.js';

const context: AuditContext = { actor: { employeeId: 4, name: 'Sam' }, ipAddress: '10.0.0.5' };
const viewer = (extra: AuthUser['permissions'] = {}): AuthUser => ({
  sessionId: 1,
  employeeId: 4,
  employeeCode: 'EMP-004',
  name: 'Sam',
  email: 'sam@firm.ae',
  isSuperAdmin: false,
  mustChangePassword: false,
  preferredLanguage: 'en',
  emailNotificationsEnabled: true,
  permissions: { 'leads.view': 'all', 'leads.edit': 'all', ...extra },
});

const lead: LeadDetail = {
  id: 3,
  name: 'Desert Foods LLC',
  contactName: 'Omar',
  email: 'omar@desertfoods.ae',
  phone: null,
  source: 'Referral',
  services: ['vat'],
  estimatedValue: 12000,
  status: 'New',
  owner: { id: 4, name: 'Sam' },
  nextFollowUpDate: '2026-10-20',
  followUpDue: false,
  lostReason: null,
  notes: null,
  client: null,
  createdBy: { id: 4, name: 'Sam' },
  version: 1,
  createdAt: new Date(),
  updatedAt: new Date(),
  followUps: [],
};

function fakeDatabase(current: Partial<LeadDetail> = {}) {
  const row = { ...lead, ...current };
  const writes: { sql: string; params: unknown[] }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return {};
    if (sql.includes('AS "visible"')) return { rows: [{ visible: true, allowed: true }] };
    if (sql.includes('FOR UPDATE')) return { rows: [{}] };
    if (sql.includes('"status" = \'Active\'')) return { rowCount: 1, rows: [{ name: 'Sam' }] };
    if (/^(INSERT|UPDATE)/.test(sql.trim())) {
      writes.push({ sql, params });
      return { rows: [{ id: 3 }] };
    }
    if (sql.includes('FROM "LeadFollowUp"')) return { rows: [] };
    if (sql.includes('FROM "Lead" l')) return { rows: [row] };
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { query, release: vi.fn(), writes };
}

async function serviceWith(db: ReturnType<typeof fakeDatabase>) {
  const record = vi.fn().mockResolvedValue(undefined);
  const createIn = vi.fn().mockResolvedValue({ id: 11, clientCode: 'CL-0011' });
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      LeadsService,
      { provide: POSTGRES_POOL, useValue: { query: db.query, connect: vi.fn().mockResolvedValue(db) } },
      { provide: AuditService, useValue: { record } },
      { provide: ClientsService, useValue: { createIn } },
    ],
  }).compile();
  return { service: module.get(LeadsService), record, createIn };
}

const edit = (changes = {}) => ({ name: lead.name, contactName: 'Omar', email: lead.email, source: 'Referral' as const, services: ['vat' as const], estimatedValue: 12000, ownerId: 4, nextFollowUpDate: '2026-10-20', version: 1, ...changes });

describe('LeadsService', () => {
  it('limits "own" to leads the viewer owns or created', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await service.list(viewer({ 'leads.view': 'own' }), {});

    const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('(l."ownerId" = $1 OR l."createdById" = $1)');
    expect(params).toEqual([4]);
  });

  it('needs a reason to mark a lead lost', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await expect(service.update(viewer(), 3, edit({ status: 'Lost' }), context)).rejects.toMatchObject({
      response: { code: 'leads.lost_reason_required' },
    });
    expect(db.writes).toEqual([]);
  });

  it('keeps a converted lead won', async () => {
    const db = fakeDatabase({ status: 'Won', client: { id: 11, name: 'Desert Foods LLC', clientCode: 'CL-0011' } });
    const { service } = await serviceWith(db);

    await expect(service.update(viewer(), 3, edit({ status: 'Contacted' }), context)).rejects.toMatchObject({
      response: { code: 'leads.converted_locked' },
    });
  });

  it('records only what changed', async () => {
    const db = fakeDatabase();
    const { service, record } = await serviceWith(db);

    await service.update(viewer(), 3, edit({ status: 'Proposal sent', estimatedValue: 15000 }), context);

    expect(record.mock.calls[0][2].changes).toEqual({
      estimatedValue: { from: 12000, to: 15000 },
      status: { from: 'New', to: 'Proposal sent' },
    });
  });

  it('a first follow-up marks the lead contacted and moves the next date', async () => {
    const db = fakeDatabase();
    const { service, record } = await serviceWith(db);

    await service.addFollowUp(
      viewer(),
      3,
      { kind: 'Call', note: 'Interested in VAT filing', happenedOn: '2026-10-15', nextFollowUpDate: '2026-10-22' },
      context,
    );

    const update = db.writes.find((w) => w.sql.includes('UPDATE "Lead"'))!;
    expect(update.params).toEqual([3, 'Contacted', '2026-10-22']);
    expect(record.mock.calls[0][2].changes).toMatchObject({ status: { from: 'New', to: 'Contacted' } });
  });

  it('converts into a client in the same transaction', async () => {
    const db = fakeDatabase({ status: 'Proposal sent' });
    const { service, createIn, record } = await serviceWith(db);

    await service.convert(viewer({ 'clients.create': 'all' }), 3, context);

    expect(createIn).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ name: 'Desert Foods LLC', contactEmail: 'omar@desertfoods.ae', accountManagerId: 4 }),
      context,
    );
    expect(db.writes.find((w) => w.sql.includes('"status" = \'Won\''))!.params).toEqual([3, 11]);
    expect(record.mock.calls.at(-1)?.[2]).toMatchObject({ action: 'lead.converted' });
  });

  it('needs clients.create to convert', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await expect(service.convert(viewer(), 3, context)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.query).not.toHaveBeenCalled();
  });

  it.each([
    [{ status: 'Lost' as const, lostReason: 'Went elsewhere' }, 'leads.lost_cannot_convert'],
    [{ status: 'Won' as const, client: { id: 11, name: 'x', clientCode: 'CL-0011' } }, 'leads.already_converted'],
  ])('refuses to convert %o', async (state, code) => {
    const db = fakeDatabase(state);
    const { service, createIn } = await serviceWith(db);

    await expect(service.convert(viewer({ 'clients.create': 'all' }), 3, context)).rejects.toMatchObject({
      response: { code },
    });
    expect(createIn).not.toHaveBeenCalled();
  });
});
