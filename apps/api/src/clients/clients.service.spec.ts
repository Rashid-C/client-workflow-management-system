import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { ClientsService } from './clients.service.js';
import type { UpdateClientDto } from './dto/create-client.dto.js';

const context: AuditContext = {
  actor: { employeeId: 1, name: 'Maria Manager' },
  ipAddress: '10.0.0.5',
};

const viewer = (scope: 'own' | 'all', edit: 'own' | 'all' | undefined = scope): AuthUser => ({
  employeeId: 4,
  employeeCode: 'E-4',
  name: 'Sam Staff',
  email: 'sam@firm.ae',
  isSuperAdmin: false,
  mustChangePassword: false,
  preferredLanguage: 'en',
  emailNotificationsEnabled: true,
  permissions: { 'clients.view': scope, ...(edit ? { 'clients.edit': edit } : {}) },
  sessionId: 1,
});

const stored = {
  id: 7,
  clientCode: 'CL-0007',
  name: 'Gulf Trading',
  companyName: 'Gulf Trading LLC',
  legalNameAr: null,
  entityType: 'LLC',
  jurisdiction: 'Mainland',
  freeZone: null,
  emirate: 'Abu Dhabi',
  tradeLicenseNumber: null,
  licenseAuthority: null,
  businessActivity: null,
  vatTrn: '100123456789003',
  corporateTaxTrn: null,
  financialYearEndMonth: 12,
  email: null,
  phone: null,
  address: null,
  contactName: null,
  contactDesignation: null,
  contactEmail: null,
  contactPhone: null,
  accountManagerId: null as number | null,
  notes: null,
  isActive: true,
  version: 3,
};

/** Answers each query by what its SQL asks for, and keeps every write. */
function fakeDatabase(options: {
  visible?: boolean;
  allowed?: boolean;
  client?: Partial<typeof stored>;
  activeEmployees?: Record<number, string>;
  openTasks?: number;
  insertError?: object;
} = {}) {
  const client = { ...stored, ...options.client };
  const writes: { sql: string; params: unknown[] }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return {};
    if (sql.includes('AS "visible"')) {
      return { rows: options.visible === false ? [] : [{ visible: true, allowed: options.allowed ?? true }] };
    }
    if (sql.includes('INSERT INTO "Client"')) {
      writes.push({ sql, params });
      if (options.insertError) throw options.insertError;
      return { rows: [{ id: 7 }] };
    }
    if (sql.includes('UPDATE "Client"')) {
      writes.push({ sql, params });
      return { rows: [] };
    }
    if (sql.includes('"status" = \'Active\' FOR SHARE')) {
      const name = options.activeEmployees?.[params[0] as number];
      return { rows: name ? [{ name }] : [] };
    }
    if (sql.startsWith('SELECT "name" FROM "Employee"')) return { rows: [{ name: 'Old Manager' }] };
    if (sql.includes('AS "count" FROM "Task"')) return { rows: [{ count: options.openTasks ?? 0 }] };
    if (sql.includes('FOR UPDATE')) return { rows: [client] };
    if (sql.includes('SELECT c.*')) {
      return { rows: [{ ...client, accountManager: null, openTasks: 0, totalTasks: 0 }] };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { query, release: vi.fn(), writes };
}

async function serviceWith(db: ReturnType<typeof fakeDatabase>) {
  const record = vi.fn().mockResolvedValue(undefined);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      ClientsService,
      { provide: POSTGRES_POOL, useValue: { query: db.query, connect: vi.fn().mockResolvedValue(db) } },
      { provide: AuditService, useValue: { record } },
    ],
  }).compile();
  return { service: module.get(ClientsService), record };
}

const sqlOf = (db: ReturnType<typeof fakeDatabase>) => db.query.mock.calls.map(([sql]) => sql as string);
const edit = (changes: Partial<UpdateClientDto> = {}): UpdateClientDto =>
  ({ ...stored, version: 3, ...changes }) as UpdateClientDto;

describe('ClientsService', () => {
  describe('create', () => {
    it('issues the code from the sequence and audits names, not ids', async () => {
      const db = fakeDatabase({ activeEmployees: { 9: 'Aisha Accountant' } });
      const { service, record } = await serviceWith(db);

      await service.create({ name: 'Gulf Trading', vatTrn: '100123456789003', accountManagerId: 9 }, context);

      expect(db.writes[0].sql).toContain(`nextval('"Client_code_seq"')`);
      const entry = record.mock.calls[0][2];
      expect(entry).toMatchObject({ action: 'client.created', entityType: 'Client', entityId: 7 });
      expect(entry.changes).toMatchObject({ name: 'Gulf Trading', accountManager: 'Aisha Accountant' });
      expect(entry.changes).not.toHaveProperty('accountManagerId');
      expect(entry.changes).not.toHaveProperty('email'); // empty fields are left out
      expect(sqlOf(db).at(-1)).toBe('COMMIT');
      expect(db.release).toHaveBeenCalledOnce();
    });

    it('keeps a free zone name only for free zone clients', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await service.create({ name: 'Gulf Trading', jurisdiction: 'Mainland', freeZone: 'KIZAD' }, context);

      const columns = db.writes[0].sql.match(/\("clientCode", (.*), "updatedAt"\)/)![1].split(', ');
      expect(db.writes[0].params[columns.indexOf('"freeZone"')]).toBeNull();
    });

    it('refuses an account manager who is not an active employee', async () => {
      const db = fakeDatabase({ activeEmployees: {} });
      const { service, record } = await serviceWith(db);

      await expect(service.create({ name: 'Gulf Trading', accountManagerId: 9 }, context)).rejects.toMatchObject({
        response: { code: 'clients.inactive_manager' },
      });
      expect(db.writes).toEqual([]);
      expect(record).not.toHaveBeenCalled();
      expect(sqlOf(db).at(-1)).toBe('ROLLBACK');
    });

    it.each([
      ['Client_vatTrn_key', 'clients.vat_trn_taken'],
      ['Client_corporateTaxTrn_key', 'clients.ct_trn_taken'],
    ])('reports a duplicate %s as %s', async (constraint, code) => {
      const db = fakeDatabase({ insertError: { code: '23505', constraint } });
      const { service, record } = await serviceWith(db);

      const failure = service.create({ name: 'Gulf Trading' }, context);
      await expect(failure).rejects.toBeInstanceOf(ConflictException);
      await expect(failure).rejects.toMatchObject({ response: { code } });
      expect(record).not.toHaveBeenCalled();
      expect(db.release).toHaveBeenCalledOnce();
    });
  });

  describe('update', () => {
    it('records only the fields that changed', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.update(viewer('all'), 7, edit({ emirate: 'Dubai', notes: 'Year end in March' }), context);

      expect(db.writes).toHaveLength(1);
      expect(db.writes[0].sql).toContain('"version" = "version" + 1');
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'client.updated',
        changes: {
          emirate: { from: 'Abu Dhabi', to: 'Dubai' },
          notes: { from: null, to: 'Year end in March' },
        },
      });
      expect(Object.keys(record.mock.calls[0][2].changes)).toEqual(['emirate', 'notes']);
    });

    it('shows a new account manager by name', async () => {
      const db = fakeDatabase({ client: { accountManagerId: 3 }, activeEmployees: { 9: 'Aisha Accountant' } });
      const { service, record } = await serviceWith(db);

      await service.update(viewer('all'), 7, edit({ accountManagerId: 9 }), context);

      expect(record.mock.calls[0][2].changes).toEqual({
        accountManager: { from: 'Old Manager', to: 'Aisha Accountant' },
      });
    });

    it('writes nothing when nothing changed', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.update(viewer('all'), 7, edit(), context);

      expect(db.writes).toEqual([]);
      expect(record).not.toHaveBeenCalled();
    });

    it('refuses an edit based on an old version', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await expect(service.update(viewer('all'), 7, edit({ version: 2, name: 'New' }), context)).rejects.toMatchObject({
        response: { code: 'clients.stale' },
      });
      expect(db.writes).toEqual([]);
    });

    it('refuses to edit an archived client', async () => {
      const db = fakeDatabase({ client: { isActive: false } });
      const { service } = await serviceWith(db);

      await expect(service.update(viewer('all'), 7, edit({ name: 'New' }), context)).rejects.toMatchObject({
        response: { code: 'clients.archived' },
      });
    });

    it('hides clients outside the viewer’s scope', async () => {
      const db = fakeDatabase({ visible: false });
      const { service } = await serviceWith(db);

      await expect(service.update(viewer('own'), 7, edit(), context)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('forbids editing a client the viewer may only see', async () => {
      const db = fakeDatabase({ allowed: false });
      const { service } = await serviceWith(db);

      await expect(service.update(viewer('all', 'own'), 7, edit(), context)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('archive', () => {
    it('refuses while the client has open tasks', async () => {
      const db = fakeDatabase({ openTasks: 2 });
      const { service, record } = await serviceWith(db);

      const failure = service.setArchived(viewer('all'), 7, true, null, context);
      await expect(failure).rejects.toBeInstanceOf(BadRequestException);
      await expect(failure).rejects.toMatchObject({
        response: { code: 'clients.has_open_tasks', params: { count: 2 } },
      });
      expect(db.writes).toEqual([]);
      expect(record).not.toHaveBeenCalled();
    });

    it('archives with the reason in the history', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.setArchived(viewer('all'), 7, true, 'Engagement ended', context);

      expect(db.writes[0].params).toEqual([7, false]);
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'client.archived',
        reason: 'Engagement ended',
      });
    });

    it('does nothing when the client is already in that state', async () => {
      const db = fakeDatabase({ client: { isActive: false } });
      const { service, record } = await serviceWith(db);

      await service.setArchived(viewer('all'), 7, true, null, context);

      expect(db.writes).toEqual([]);
      expect(record).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('limits "own" to clients the viewer manages or works on', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);
      db.query.mockResolvedValueOnce({ rows: [] } as never);

      await service.findAll(viewer('own'));

      const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('c."accountManagerId" = $1');
      expect(sql).toContain('vs."assigneeId" = $1');
      expect(params).toEqual([4]);
    });

    it('shows every client to "all"', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);
      db.query.mockResolvedValueOnce({ rows: [] } as never);

      await service.findAll(viewer('all'));

      expect(db.query.mock.calls[0][0]).toContain('WHERE TRUE');
    });
  });
});
