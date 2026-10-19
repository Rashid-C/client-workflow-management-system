import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { UpdateSettingsDto } from './dto.js';
import { SettingsService } from './settings.service.js';

const context: AuditContext = { actor: { employeeId: 1, name: 'Admin' }, ipAddress: '10.0.0.5' };

const stored = {
  companyName: 'Al Fath Accounts & Tax Solutions',
  companyNameAr: null,
  companyTrn: null,
  email: 'info@alfathuae.com',
  phone: '+971 58 584 8008',
  address: 'Abu Dhabi',
  workingDays: [1, 2, 3, 4, 5],
  workdayStart: '08:30',
  workdayEnd: '17:30',
  documentReminderDays: 30,
  version: 2,
  updatedAt: new Date(),
};

function fakeDatabase() {
  const writes: { sql: string; params: unknown[] }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return {};
    if (sql.trim().startsWith('UPDATE')) {
      writes.push({ sql, params });
      return {};
    }
    if (sql.includes('FROM "Setting"')) return { rows: [stored] };
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { query, release: vi.fn(), writes };
}

async function serviceWith(db: ReturnType<typeof fakeDatabase>) {
  const record = vi.fn().mockResolvedValue(undefined);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      SettingsService,
      { provide: POSTGRES_POOL, useValue: { query: db.query, connect: vi.fn().mockResolvedValue(db) } },
      { provide: AuditService, useValue: { record } },
    ],
  }).compile();
  return { service: module.get(SettingsService), record };
}

const edit = (changes: Partial<UpdateSettingsDto> = {}): UpdateSettingsDto => {
  const { updatedAt: _, ...values } = stored;
  return { ...values, ...changes } as UpdateSettingsDto;
};

describe('SettingsService', () => {
  it('records only what changed, with working days in order', async () => {
    const db = fakeDatabase();
    const { service, record } = await serviceWith(db);

    await service.update(edit({ workingDays: [6, 1, 2, 3, 4], documentReminderDays: 45 }), context);

    expect(record.mock.calls[0][2].changes).toEqual({
      workingDays: { from: [1, 2, 3, 4, 5], to: [1, 2, 3, 4, 6] },
      documentReminderDays: { from: 30, to: 45 },
    });
    expect(db.writes[0].params).toContain('[1,2,3,4,6]');
  });

  it('writes nothing when nothing changed', async () => {
    const db = fakeDatabase();
    const { service, record } = await serviceWith(db);

    await service.update(edit(), context);

    expect(db.writes).toEqual([]);
    expect(record).not.toHaveBeenCalled();
  });

  it('refuses a working day that ends before it starts', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await expect(service.update(edit({ workdayEnd: '08:00' }), context)).rejects.toMatchObject({
      response: { code: 'settings.invalid_hours' },
    });
    expect(db.query).not.toHaveBeenCalled();
  });

  it('refuses an edit based on an old version', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);

    await expect(service.update(edit({ version: 1, companyName: 'X' }), context)).rejects.toMatchObject({
      response: { code: 'settings.stale' },
    });
    expect(db.writes).toEqual([]);
  });
});
