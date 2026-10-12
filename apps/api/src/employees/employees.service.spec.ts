import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { AuthUser } from '../auth/session.js';
import {
  EmployeesService,
  SUPER_ADMIN_INVARIANT_LOCK,
} from './employees.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { CreateEmployeeDto } from './dto/create-employee.dto.js';

describe('EmployeesService', () => {
  let service: EmployeesService;
  let pool: {
    query: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  };
  let connection: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };

  const admin: AuthUser = {
    sessionId: 1,
    employeeId: 99,
    employeeCode: 'ADMIN-001',
    name: 'Admin',
    email: 'admin@firm.ae',
    isSuperAdmin: true,
    mustChangePassword: false,
    permissions: { 'employees.view': 'all', 'employees.deactivate': 'all' },
  };

  const newEmployee: CreateEmployeeDto = {
    employeeCode: 'EMP-001',
    name: ' Aisha Rahman ',
    email: ' AISHA@FIRM.AE ',
    designation: 'Senior Auditor',
    roleIds: [2, 3],
    joinedDate: '2026-10-12',
    temporaryPassword: 'temporary-pass-123',
  };

  const savedEmployee = {
    id: 1,
    employeeCode: 'EMP-001',
    name: 'Aisha Rahman',
    email: 'aisha@firm.ae',
    phone: null,
    designation: 'Senior Auditor',
    status: 'Active',
    joinedDate: '2026-10-12',
    roles: [
      { id: 2, name: 'Manager', isSystem: false },
      { id: 3, name: 'Staff', isSystem: false },
    ],
  };

  const sqlCalls = () =>
    connection.query.mock.calls.map(([sql]) => String(sql));

  beforeEach(async () => {
    connection = { query: vi.fn(), release: vi.fn() };
    pool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(connection),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        { provide: POSTGRES_POOL, useValue: pool },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  describe('findAll', () => {
    it('loads every employee and their roles in a single query', async () => {
      pool.query.mockResolvedValue({ rows: [savedEmployee] });

      await expect(service.findAll(admin)).resolves.toEqual([savedEmployee]);

      expect(pool.query).toHaveBeenCalledOnce();
      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('json_agg');
      expect(sql).not.toContain('WHERE e."id"');
      expect(params).toEqual([]);
    });

    it('limits "own" scope to the viewer themselves', async () => {
      pool.query.mockResolvedValue({ rows: [] });
      const staff = { ...admin, employeeId: 4, permissions: { 'employees.view': 'own' as const } };

      await service.findAll(staff);

      const [sql, params] = pool.query.mock.calls[0];
      expect(sql).toContain('WHERE e."id" = $1');
      expect(params).toEqual([4]);
    });
  });

  describe('create', () => {
    it('inserts the employee, roles and a temporary credential, then commits', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 2 }, { id: 3 }] }) // roles exist
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT Employee
        .mockResolvedValueOnce({}) // INSERT EmployeeRole
        .mockResolvedValueOnce({}) // INSERT EmployeeCredential
        .mockResolvedValueOnce({ rows: [savedEmployee] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await expect(service.create(newEmployee)).resolves.toEqual(
        savedEmployee,
      );

      expect(connection.query.mock.calls[2][1]).toEqual([
        'EMP-001',
        'Aisha Rahman',
        'aisha@firm.ae',
        null,
        'Senior Auditor',
        'Active',
        '2026-10-12',
      ]);
      expect(connection.query.mock.calls[3][1]).toEqual([1, [2, 3]]);

      const [credentialSql, credentialParams] = connection.query.mock.calls[4];
      expect(credentialSql).toContain('"EmployeeCredential"');
      expect(credentialParams[0]).toBe(1);
      expect(credentialParams[1]).toMatch(/^\$argon2id\$/);
      expect(credentialParams).not.toContain('temporary-pass-123');

      expect(sqlCalls().at(-1)).toBe('COMMIT');
      expect(connection.release).toHaveBeenCalledOnce();
    });

    it('rejects unknown roles without inserting anything', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 2 }] }) // only one of two found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.create(newEmployee)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(sqlCalls().some((sql) => sql.includes('INSERT'))).toBe(false);
      expect(sqlCalls().at(-1)).toBe('ROLLBACK');
      expect(connection.release).toHaveBeenCalledOnce();
    });

    it.each([
      ['23505', ConflictException],
      ['23503', BadRequestException],
      ['22008', BadRequestException],
    ])(
      'maps Postgres error %s to a client error and rolls back',
      async (code, expected) => {
        connection.query
          .mockResolvedValueOnce({}) // BEGIN
          .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 2 }, { id: 3 }] })
          .mockRejectedValueOnce({ code }) // INSERT Employee fails
          .mockResolvedValueOnce({}); // ROLLBACK

        await expect(service.create(newEmployee)).rejects.toBeInstanceOf(
          expected,
        );
        expect(sqlCalls().at(-1)).toBe('ROLLBACK');
        expect(connection.release).toHaveBeenCalledOnce();
      },
    );

    it('rethrows unexpected database errors unchanged', async () => {
      const failure = new Error('connection reset');
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(failure) // roles lookup fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.create(newEmployee)).rejects.toBe(failure);
      expect(connection.release).toHaveBeenCalledOnce();
    });
  });

  describe('updateStatus', () => {
    const target = (overrides = {}) => ({
      rows: [{ id: 1, status: 'Active', isSuperAdmin: false, ...overrides }],
    });

    it('takes the Super Admin lock, deactivates and signs the person out', async () => {
      const updated = { ...savedEmployee, status: 'Inactive' };
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce(target())
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}) // DELETE sessions
        .mockResolvedValueOnce({ rows: [updated] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await expect(
        service.updateStatus('EMP-001', 'Inactive', admin),
      ).resolves.toEqual(updated);

      expect(connection.query.mock.calls[1]).toEqual([
        'SELECT pg_advisory_xact_lock($1)',
        [SUPER_ADMIN_INVARIANT_LOCK],
      ]);
      expect(connection.query.mock.calls[3][1]).toEqual(['Inactive', 1]);
      expect(sqlCalls()[4]).toContain('DELETE FROM "Session"');
      expect(connection.query.mock.calls[4][1]).toEqual([1]);
      expect(sqlCalls().at(-1)).toBe('COMMIT');
    });

    it('keeps sessions when reactivating', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce(target({ status: 'Inactive' }))
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({ rows: [savedEmployee] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await service.updateStatus('EMP-001', 'Active', admin);

      expect(sqlCalls().some((sql) => sql.includes('DELETE'))).toBe(false);
    });

    it('returns 404 for an unknown employee', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce({ rows: [] }) // not found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        service.updateStatus('EMP-999', 'Inactive', admin),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(sqlCalls().at(-1)).toBe('ROLLBACK');
      expect(connection.release).toHaveBeenCalledOnce();
    });

    it('refuses to let someone deactivate themselves', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce(target({ id: admin.employeeId }))
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        service.updateStatus('ADMIN-001', 'Inactive', admin),
      ).rejects.toThrow('You cannot deactivate yourself');
      expect(sqlCalls().at(-1)).toBe('ROLLBACK');
    });

    it('refuses to deactivate the last active Super Admin', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce(target({ isSuperAdmin: true }))
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // no other admins
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        service.updateStatus('EMP-001', 'Inactive', admin),
      ).rejects.toThrow('At least one active Super Admin must remain');
      expect(
        sqlCalls().some((sql) => sql.includes('UPDATE "Employee"')),
      ).toBe(false);
      expect(sqlCalls().at(-1)).toBe('ROLLBACK');
    });

    it('allows deactivating a Super Admin while another stays active', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce(target({ isSuperAdmin: true }))
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // one other admin
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({}) // DELETE sessions
        .mockResolvedValueOnce({ rows: [savedEmployee] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await expect(
        service.updateStatus('EMP-001', 'Inactive', admin),
      ).resolves.toBeDefined();
      expect(sqlCalls().at(-1)).toBe('COMMIT');
    });
  });
});
