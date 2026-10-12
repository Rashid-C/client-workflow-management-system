
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { CreateEmployeeDto } from './dto/create-employee.dto.js';

export interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  role: string;
  status: string;
  joinedDate: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class EmployeesService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<Employee[]> {
    const result = await this.pool.query<Employee>(
      `SELECT * FROM "Employee" ORDER BY "id" ASC`,
    );

    return result.rows;
  }

  async create(data: CreateEmployeeDto): Promise<Employee> {
    const joinedDate = data.joinedDate.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(joinedDate)) {
      throw new BadRequestException('joinedDate must use YYYY-MM-DD format');
    }

    const status = data.status ?? 'Active';

    const connection = await this.pool.connect();

    try {
      await connection.query('BEGIN');

      // Serialize employee creation/status checks across concurrent requests.
      await connection.query(
        `LOCK TABLE "Employee" IN SHARE ROW EXCLUSIVE MODE`,
      );

      if (data.role === 'Super Admin' && status !== 'Active') {
        const activeAdmins = await connection.query<{ count: string }>(
          `SELECT COUNT(*) AS count
           FROM "Employee"
           WHERE "role" = 'Super Admin' AND "status" = 'Active'`,
        );

        if (Number(activeAdmins.rows[0].count) === 0) {
          throw new BadRequestException(
            'At least one active Super Admin must remain',
          );
        }
      }

      const result = await connection.query<Employee>(
        `INSERT INTO "Employee"
          ("employeeCode", "name", "email", "phone", "designation",
           "role", "status", "joinedDate", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         RETURNING *`,
        [
          data.employeeCode.trim(),
          data.name.trim(),
          data.email.trim().toLowerCase(),
          data.phone?.trim() || null,
          data.designation.trim(),
          data.role,
          status,
          joinedDate,
        ],
      );

      await connection.query('COMMIT');
      return result.rows[0];
    } catch (error: unknown) {
      await connection.query('ROLLBACK');

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(
          'Employee code or email already exists',
        );
      }

      throw error;
    } finally {
      connection.release();
    }
  }

  async updateStatus(
    employeeCode: string,
    status: 'Active' | 'Inactive',
  ): Promise<Employee> {
    const connection = await this.pool.connect();

    try {
      await connection.query('BEGIN');

      // Serialize status changes to protect the last active Super Admin.
      await connection.query(
        `LOCK TABLE "Employee" IN SHARE ROW EXCLUSIVE MODE`,
      );

      const employeeResult = await connection.query<Employee>(
        `SELECT * FROM "Employee"
         WHERE "employeeCode" = $1
         FOR UPDATE`,
        [employeeCode],
      );

      const employee = employeeResult.rows[0];

      if (!employee) {
        throw new NotFoundException('Employee not found');
      }

      if (
        employee.role === 'Super Admin' &&
        employee.status === 'Active' &&
        status === 'Inactive'
      ) {
        const activeAdmins = await connection.query<{ count: string }>(
          `SELECT COUNT(*) AS count
           FROM "Employee"
           WHERE "role" = 'Super Admin' AND "status" = 'Active'`,
        );

        if (Number(activeAdmins.rows[0].count) <= 1) {
          throw new BadRequestException(
            'At least one active Super Admin must remain',
          );
        }
      }

      const result = await connection.query<Employee>(
        `UPDATE "Employee"
         SET "status" = $1, "updatedAt" = NOW()
         WHERE "employeeCode" = $2
         RETURNING *`,
        [status, employeeCode],
      );

      await connection.query('COMMIT');
      return result.rows[0];
    } catch (error: unknown) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
}
