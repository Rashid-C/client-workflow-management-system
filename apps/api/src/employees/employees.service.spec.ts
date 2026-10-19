import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { CreateEmployeeDto, UpdateEmployeeDto } from './dto/create-employee.dto.js';
import {
  EMPLOYEE_CODE_LOCK,
  EmployeesService,
  SUPER_ADMIN_INVARIANT_LOCK,
  type Employee,
} from './employees.service.js';

const SUPER_ADMIN_ROLE = { id: 1, name: 'Super Admin', isSystem: true };
const MANAGER_ROLE = { id: 2, name: 'Manager', isSystem: false };
const STAFF_ROLE = { id: 3, name: 'Staff', isSystem: false };
const ROLES = [SUPER_ADMIN_ROLE, MANAGER_ROLE, STAFF_ROLE];

const viewer = (overrides: Partial<AuthUser> = {}): AuthUser => ({
  sessionId: 1,
  employeeId: 99,
  employeeCode: 'ADMIN-001',
  name: 'Admin',
  email: 'admin@firm.ae',
  isSuperAdmin: true,
  mustChangePassword: false,
  preferredLanguage: 'en',
  emailNotificationsEnabled: true,
  permissions: { 'employees.view': 'all' },
  ...overrides,
});
const manager = viewer({ employeeId: 50, employeeCode: 'EMP-050', isSuperAdmin: false });

const context: AuditContext = { actor: { employeeId: 99, name: 'Admin' }, ipAddress: '10.0.0.5' };

const aisha: Employee = {
  id: 7,
  employeeCode: 'EMP-007',
  name: 'Aisha Rahman',
  email: 'aisha@firm.ae',
  phone: null,
  designation: 'Senior Auditor',
  status: 'Active',
  joinedDate: '2026-10-12',
  roles: [STAFF_ROLE],
  version: 4,
  openStages: 2,
  mustChangePassword: false,
  isLocked: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const details = (changes: Partial<UpdateEmployeeDto> = {}): UpdateEmployeeDto => ({
  name: aisha.name,
  email: aisha.email,
  designation: aisha.designation,
  joinedDate: aisha.joinedDate,
  roleIds: [3],
  version: 4,
  ...changes,
});

/** Answers each query by what its SQL asks for, and keeps every write. */
function fakeDatabase(options: { employee?: Partial<Employee> | null; otherSuperAdmins?: number; nextCode?: string } = {}) {
  const employee = options.employee === null ? undefined : { ...aisha, ...options.employee };
  const writes: { sql: string; params: unknown[] }[] = [];
  const locks: unknown[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return {};
    if (sql.includes('pg_advisory_xact_lock')) {
      locks.push(params[0]);
      return {};
    }
    if (sql.includes('FROM "Role" WHERE "id" = ANY')) {
      const rows = ROLES.filter((role) => (params[0] as number[]).includes(role.id));
      return { rowCount: rows.length, rows };
    }
    if (sql.includes(`'EMP-' || lpad`)) return { rows: [{ code: options.nextCode ?? 'EMP-008' }] };
    if (sql.includes('FOR UPDATE')) return { rows: employee ? [{ id: employee.id }] : [] };
    if (sql.includes('COUNT(DISTINCT e."id")')) return { rows: [{ count: options.otherSuperAdmins ?? 0 }] };
    if (/^(INSERT|UPDATE|DELETE)/.test(sql.trim())) {
      writes.push({ sql, params });
      return { rows: [{ id: employee?.id ?? 8 }] };
    }
    if (sql.includes('FROM "Employee" e')) return { rows: employee ? [employee] : [] };
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { query, release: vi.fn(), writes, locks };
}

async function serviceWith(db: ReturnType<typeof fakeDatabase>) {
  const record = vi.fn().mockResolvedValue(undefined);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      EmployeesService,
      { provide: POSTGRES_POOL, useValue: { query: db.query, connect: vi.fn().mockResolvedValue(db) } },
      { provide: AuditService, useValue: { record } },
    ],
  }).compile();
  return { service: module.get(EmployeesService), record };
}

const wrote = (db: ReturnType<typeof fakeDatabase>, fragment: string) =>
  db.writes.some((write) => write.sql.includes(fragment));

describe('EmployeesService', () => {
  describe('findAll and findOne', () => {
    it('limits "own" scope to the viewer themselves', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await service.findAll(viewer({ permissions: { 'employees.view': 'own' } }));

      const [sql, params] = db.query.mock.calls[0] as [string, unknown[]];
      expect(sql).toContain('WHERE e."id" = $1');
      expect(params).toEqual([99]);
    });

    it('hides someone else from an "own" viewer', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await expect(
        service.findOne(viewer({ permissions: { 'employees.view': 'own' } }), 'EMP-007'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    const input = (changes: Partial<CreateEmployeeDto> = {}): CreateEmployeeDto => ({
      name: ' Aisha Rahman ',
      email: ' AISHA@FIRM.AE ',
      designation: 'Senior Auditor',
      roleIds: [3],
      joinedDate: '2026-10-12',
      temporaryPassword: 'temporary-pass-123',
      ...changes,
    });

    it('issues the next code under its lock and stores a temporary credential', async () => {
      const db = fakeDatabase({ nextCode: 'EMP-008' });
      const { service, record } = await serviceWith(db);

      await service.create(viewer(), input(), context);

      expect(db.locks).toEqual([EMPLOYEE_CODE_LOCK]);
      const insert = db.writes.find((w) => w.sql.includes('INSERT INTO "Employee"'))!;
      expect(insert.params.slice(0, 3)).toEqual(['EMP-008', 'Aisha Rahman', 'aisha@firm.ae']);
      expect(wrote(db, '"mustChangePassword", "updatedAt")')).toBe(true);
      expect(record.mock.calls[0][2].changes).not.toHaveProperty('temporaryPassword');
    });

    it('lets only a Super Admin create a Super Admin', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await expect(service.create(manager, input({ roleIds: [1] }), context)).rejects.toMatchObject({
        response: { code: 'employees.super_admin_only' },
      });
      expect(db.writes).toEqual([]);
      expect(record).not.toHaveBeenCalled();
    });

    it('rejects unknown roles without inserting anything', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await expect(service.create(viewer(), input({ roleIds: [3, 77] }), context)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(db.writes).toEqual([]);
    });
  });

  describe('update', () => {
    it('records only what changed, roles by name', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.update(viewer(), 'EMP-007', details({ designation: 'Audit Manager', roleIds: [2, 3] }), context);

      expect(db.locks).toEqual([SUPER_ADMIN_INVARIANT_LOCK]);
      expect(record.mock.calls[0][2].changes).toEqual({
        designation: { from: 'Senior Auditor', to: 'Audit Manager' },
        roles: { from: 'Staff', to: 'Manager, Staff' },
      });
      expect(wrote(db, '"version" = "version" + 1')).toBe(true);
      expect(wrote(db, 'INSERT INTO "EmployeeRole"')).toBe(true);
    });

    it('writes nothing when nothing changed', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.update(viewer(), 'EMP-007', details(), context);

      expect(db.writes).toEqual([]);
      expect(record).not.toHaveBeenCalled();
    });

    it('refuses an edit based on an old version', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      const failure = service.update(viewer(), 'EMP-007', details({ name: 'New', version: 3 }), context);
      await expect(failure).rejects.toBeInstanceOf(ConflictException);
      await expect(failure).rejects.toMatchObject({ response: { code: 'employees.stale' } });
    });

    it('refuses a change to one’s own roles', async () => {
      const db = fakeDatabase({ employee: { id: 50 } });
      const { service } = await serviceWith(db);

      await expect(service.update(manager, 'EMP-007', details({ roleIds: [2] }), context)).rejects.toMatchObject({
        response: { code: 'employees.cannot_change_own_roles' },
      });
    });

    it('lets only a Super Admin grant the Super Admin role', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await expect(service.update(manager, 'EMP-007', details({ roleIds: [1] }), context)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(db.writes).toEqual([]);
    });

    it('lets only a Super Admin edit a Super Admin', async () => {
      const db = fakeDatabase({ employee: { roles: [SUPER_ADMIN_ROLE] } });
      const { service } = await serviceWith(db);

      await expect(
        service.update(manager, 'EMP-007', details({ roleIds: [1], email: 'new@firm.ae' }), context),
      ).rejects.toMatchObject({ response: { code: 'employees.super_admin_only' } });
    });

    it('keeps at least one active Super Admin', async () => {
      const db = fakeDatabase({ employee: { roles: [SUPER_ADMIN_ROLE] }, otherSuperAdmins: 0 });
      const { service } = await serviceWith(db);

      await expect(service.update(viewer(), 'EMP-007', details({ roleIds: [3] }), context)).rejects.toMatchObject({
        response: { code: 'employees.last_super_admin' },
      });
      expect(db.writes).toEqual([]);
    });

    it('removes the Super Admin role while another stays active', async () => {
      const db = fakeDatabase({ employee: { roles: [SUPER_ADMIN_ROLE] }, otherSuperAdmins: 1 });
      const { service } = await serviceWith(db);

      await service.update(viewer(), 'EMP-007', details({ roleIds: [3] }), context);

      expect(wrote(db, 'DELETE FROM "EmployeeRole"')).toBe(true);
    });
  });

  describe('updateStatus', () => {
    it('deactivates under the Super Admin lock and signs the person out', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.updateStatus(viewer(), 'EMP-007', 'Inactive', context);

      expect(db.locks).toEqual([SUPER_ADMIN_INVARIANT_LOCK]);
      expect(wrote(db, 'DELETE FROM "Session"')).toBe(true);
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'employee.status_changed',
        changes: { status: { from: 'Active', to: 'Inactive' } },
      });
    });

    it('keeps sessions when reactivating', async () => {
      const db = fakeDatabase({ employee: { status: 'Inactive' } });
      const { service } = await serviceWith(db);

      await service.updateStatus(viewer(), 'EMP-007', 'Active', context);

      expect(wrote(db, 'DELETE FROM "Session"')).toBe(false);
    });

    it('changes and records nothing when the status is already set', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.updateStatus(viewer(), 'EMP-007', 'Active', context);

      expect(db.writes).toEqual([]);
      expect(record).not.toHaveBeenCalled();
    });

    it('returns 404 for an unknown employee', async () => {
      const db = fakeDatabase({ employee: null });
      const { service } = await serviceWith(db);

      await expect(service.updateStatus(viewer(), 'EMP-999', 'Inactive', context)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses to let someone deactivate themselves', async () => {
      const db = fakeDatabase({ employee: { id: 99 } });
      const { service } = await serviceWith(db);

      await expect(service.updateStatus(viewer(), 'ADMIN-001', 'Inactive', context)).rejects.toMatchObject({
        response: { code: 'employees.cannot_deactivate_self' },
      });
    });

    it('refuses to deactivate the last active Super Admin', async () => {
      const db = fakeDatabase({ employee: { roles: [SUPER_ADMIN_ROLE] }, otherSuperAdmins: 0 });
      const { service } = await serviceWith(db);

      await expect(service.updateStatus(viewer(), 'EMP-007', 'Inactive', context)).rejects.toMatchObject({
        response: { code: 'employees.last_super_admin' },
      });
    });

    it('lets only a Super Admin deactivate a Super Admin', async () => {
      const db = fakeDatabase({ employee: { roles: [SUPER_ADMIN_ROLE] }, otherSuperAdmins: 3 });
      const { service } = await serviceWith(db);

      await expect(service.updateStatus(manager, 'EMP-007', 'Inactive', context)).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });
  });

  describe('resetPassword', () => {
    it('issues a temporary password, lifts any lock and ends every session', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.resetPassword(viewer(), 'EMP-007', 'new-temporary-123', context);

      const credential = db.writes.find((w) => w.sql.includes('"EmployeeCredential"'))!;
      expect(credential.sql).toContain('"mustChangePassword" = true');
      expect(credential.sql).toContain('"lockedUntil" = NULL');
      expect(credential.params[1]).toMatch(/^\$argon2id\$/);
      expect(wrote(db, 'DELETE FROM "Session"')).toBe(true);
      expect(JSON.stringify(record.mock.calls[0][2])).not.toContain('new-temporary-123');
    });

    it('refuses one’s own account', async () => {
      const db = fakeDatabase({ employee: { id: 99 } });
      const { service } = await serviceWith(db);

      await expect(service.resetPassword(viewer(), 'ADMIN-001', 'new-temporary-123', context)).rejects.toMatchObject({
        response: { code: 'employees.cannot_reset_own_password' },
      });
    });

    it('lets only a Super Admin reset a Super Admin', async () => {
      const db = fakeDatabase({ employee: { roles: [SUPER_ADMIN_ROLE] } });
      const { service } = await serviceWith(db);

      await expect(service.resetPassword(manager, 'EMP-007', 'new-temporary-123', context)).rejects.toMatchObject({
        response: { code: 'employees.super_admin_only' },
      });
      expect(db.writes).toEqual([]);
    });
  });
});
