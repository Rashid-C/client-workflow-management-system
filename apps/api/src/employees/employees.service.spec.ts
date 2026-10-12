import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
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

  const newEmployee: CreateEmployeeDto = {
    employeeCode: 'EMP-001',
    name: ' Aisha Rahman ',
    email: ' AISHA@FIRM.AE ',
    designation: 'Senior Auditor',
    roleIds: [2, 3],
    joinedDate: '2026-10-12',
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
    it('loads employees and their roles in a single query', async () => {
      pool.query.mockResolvedValue({ rows: [savedEmployee] });

      await expect(service.findAll()).resolves.toEqual([savedEmployee]);

      expect(pool.query).toHaveBeenCalledOnce();
      const [sql] = pool.query.mock.calls[0];
      expect(sql).toContain('json_agg');
      expect(sql).toContain('GROUP BY e."id"');
    });
  });

  describe('create', () => {
    it('inserts the employee and their roles, then commits', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 2, rows: [{ id: 2 }, { id: 3 }] }) // roles exist
        .mockResolvedValueOnce({ rows: [{ id: 1 }] }) // INSERT Employee
        .mockResolvedValueOnce({}) // INSERT EmployeeRole
        .mockResolvedValueOnce({ rows: [savedEmployee] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await expect(service.create(newEmployee)).resolves.toEqual(
        savedEmployee,
      );

      const [, insertParams] = connection.query.mock.calls[2];
      expect(insertParams).toEqual([
        'EMP-001',
        'Aisha Rahman',
        'aisha@firm.ae',
        null,
        'Senior Auditor',
        'Active',
        '2026-10-12',
      ]);
      expect(connection.query.mock.calls[3][1]).toEqual([1, [2, 3]]);
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
    it('takes the Super Admin lock and updates the status', async () => {
      const updated = { ...savedEmployee, status: 'Inactive' };
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'Active', isSuperAdmin: false }],
        })
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({ rows: [updated] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await expect(
        service.updateStatus('EMP-001', 'Inactive'),
      ).resolves.toEqual(updated);

      expect(connection.query.mock.calls[1]).toEqual([
        'SELECT pg_advisory_xact_lock($1)',
        [SUPER_ADMIN_INVARIANT_LOCK],
      ]);
      expect(connection.query.mock.calls[3][1]).toEqual(['Inactive', 1]);
      expect(sqlCalls().at(-1)).toBe('COMMIT');
    });

    it('returns 404 for an unknown employee', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce({ rows: [] }) // not found
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        service.updateStatus('EMP-999', 'Inactive'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(sqlCalls().at(-1)).toBe('ROLLBACK');
      expect(connection.release).toHaveBeenCalledOnce();
    });

    it('refuses to deactivate the last active Super Admin', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'Active', isSuperAdmin: true }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // no other admins
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        service.updateStatus('EMP-001', 'Inactive'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(
        sqlCalls().some((sql) => sql.includes('UPDATE "Employee"')),
      ).toBe(false);
      expect(sqlCalls().at(-1)).toBe('ROLLBACK');
    });

    it('allows deactivating a Super Admin while another stays active', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({}) // advisory lock
        .mockResolvedValueOnce({
          rows: [{ id: 1, status: 'Active', isSuperAdmin: true }],
        })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // one other admin
        .mockResolvedValueOnce({}) // UPDATE
        .mockResolvedValueOnce({ rows: [savedEmployee] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await expect(
        service.updateStatus('EMP-001', 'Inactive'),
      ).resolves.toBeDefined();
      expect(sqlCalls().at(-1)).toBe('COMMIT');
    });
  });
});
