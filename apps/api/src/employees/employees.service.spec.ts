
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { EmployeesService } from './employees.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';

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

  beforeEach(async () => {
    connection = {
      query: vi.fn(),
      release: vi.fn(),
    };

    pool = {
      query: vi.fn(),
      connect: vi.fn().mockResolvedValue(connection),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeesService,
        {
          provide: POSTGRES_POOL,
          useValue: pool,
        },
      ],
    }).compile();

    service = module.get<EmployeesService>(EmployeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all employees', async () => {
    const employees = [
      {
        id: 1,
        employeeCode: 'EMP-001',
        name: 'Test Employee',
      },
    ];

    pool.query.mockResolvedValue({ rows: employees });

    await expect(service.findAll()).resolves.toEqual(employees);
    expect(pool.query).toHaveBeenCalledWith(
      'SELECT * FROM "Employee" ORDER BY "id" ASC',
    );
  });

  it('should reject an invalid joinedDate before connecting to the database', async () => {
    await expect(
      service.create({
        employeeCode: 'EMP-002',
        name: 'Another Employee',
        email: 'another@tickwise.local',
        designation: 'Accountant',
        role: 'Staff',
        joinedDate: '12-10-2026',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('should create an employee and commit the transaction', async () => {
    const employee = {
      id: 2,
      employeeCode: 'EMP-002',
      name: 'Another Employee',
      email: 'another@tickwise.local',
      phone: null,
      designation: 'Accountant',
      role: 'Staff',
      status: 'Active',
      joinedDate: '2026-10-12',
    };

    connection.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // table lock
      .mockResolvedValueOnce({ rows: [employee] }) // INSERT
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    await expect(
      service.create({
        employeeCode: 'EMP-002',
        name: 'Another Employee',
        email: ' ANOTHER@TICKWISE.LOCAL ',
        designation: 'Accountant',
        role: 'Staff',
        joinedDate: '2026-10-12',
      }),
    ).resolves.toEqual(employee);

    expect(connection.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(connection.query).toHaveBeenNthCalledWith(4, 'COMMIT');
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('should reject duplicate employee codes or emails and roll back', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // table lock
      .mockRejectedValueOnce({ code: '23505' }); // unique constraint

    await expect(
      service.create({
        employeeCode: 'EMP-001',
        name: 'Duplicate Employee',
        email: 'test.employee@tickwise.local',
        designation: 'Accountant',
        role: 'Staff',
        joinedDate: '2026-10-12',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(connection.query).toHaveBeenCalledWith('ROLLBACK');
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('should update employee status and commit the transaction', async () => {
    const employee = {
      id: 2,
      employeeCode: 'EMP-002',
      name: 'Demo Accountant',
      role: 'Staff',
      status: 'Active',
    };

    const updatedEmployee = {
      ...employee,
      status: 'Inactive',
    };

    connection.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // table lock
      .mockResolvedValueOnce({ rows: [employee] }) // SELECT employee
      .mockResolvedValueOnce({ rows: [updatedEmployee] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    await expect(
      service.updateStatus('EMP-002', 'Inactive'),
    ).resolves.toEqual(updatedEmployee);

    expect(connection.query).toHaveBeenCalledWith('COMMIT');
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('should reject status updates for a missing employee', async () => {
    connection.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // table lock
      .mockResolvedValueOnce({ rows: [] }) // employee not found
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      service.updateStatus('EMP-999', 'Inactive'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(connection.query).toHaveBeenCalledWith('ROLLBACK');
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('should prevent deactivating the last active Super Admin', async () => {
    const admin = {
      id: 1,
      employeeCode: 'EMP-ADMIN',
      name: 'System Administrator',
      role: 'Super Admin',
      status: 'Active',
    };

    connection.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }) // table lock
      .mockResolvedValueOnce({ rows: [admin] }) // SELECT employee
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // active admins
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(
      service.updateStatus('EMP-ADMIN', 'Inactive'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(connection.query).toHaveBeenCalledWith('ROLLBACK');
    expect(connection.release).toHaveBeenCalledOnce();
  });
});
