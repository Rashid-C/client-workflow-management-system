import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { POSTGRES_POOL } from '../database/database.module.js';
import type {
  CreateEmployeeDto,
  EmployeeStatus,
} from './dto/create-employee.dto.js';

export interface EmployeeRoleSummary {
  id: number;
  name: string;
  isSystem: boolean;
}

export interface Employee {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  status: EmployeeStatus;
  joinedDate: string;
  roles: EmployeeRoleSummary[];
  createdAt: Date;
  updatedAt: Date;
}

// Serializes every change that could leave the firm without an active
// Super Admin (status changes now; role removal later). Any code path that
// can reduce the number of active Super Admins must take this lock first.
export const SUPER_ADMIN_INVARIANT_LOCK = 7_301_001;

// Employees with their roles in one query — no per-employee round trips.
const SELECT_EMPLOYEES = `
  SELECT e."id", e."employeeCode", e."name", e."email", e."phone",
         e."designation", e."status", e."joinedDate", e."createdAt", e."updatedAt",
         COALESCE(
           json_agg(
             json_build_object('id', r."id", 'name', r."name", 'isSystem', r."isSystem")
             ORDER BY r."name"
           ) FILTER (WHERE r."id" IS NOT NULL),
           '[]'
         ) AS "roles"
  FROM "Employee" e
  LEFT JOIN "EmployeeRole" er ON er."employeeId" = e."id"
  LEFT JOIN "Role" r ON r."id" = er."roleId"`;

@Injectable()
export class EmployeesService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<Employee[]> {
    const result = await this.pool.query<Employee>(
      `${SELECT_EMPLOYEES} GROUP BY e."id" ORDER BY e."id" ASC`,
    );

    return result.rows;
  }

  async create(data: CreateEmployeeDto): Promise<Employee> {
    const connection = await this.pool.connect();

    try {
      await connection.query('BEGIN');

      const roles = await connection.query<{ id: number }>(
        `SELECT "id" FROM "Role" WHERE "id" = ANY($1::int[])`,
        [data.roleIds],
      );

      if (roles.rowCount !== data.roleIds.length) {
        throw new BadRequestException('One or more roles do not exist');
      }

      const inserted = await connection.query<{ id: number }>(
        `INSERT INTO "Employee"
          ("employeeCode", "name", "email", "phone", "designation",
           "status", "joinedDate", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING "id"`,
        [
          data.employeeCode.trim(),
          data.name.trim(),
          data.email.trim().toLowerCase(),
          data.phone?.trim() || null,
          data.designation.trim(),
          data.status ?? 'Active',
          data.joinedDate,
        ],
      );

      const employeeId = inserted.rows[0].id;

      await connection.query(
        `INSERT INTO "EmployeeRole" ("employeeId", "roleId")
         SELECT $1, unnest($2::int[])`,
        [employeeId, data.roleIds],
      );

      const employee = await this.findById(connection, employeeId);

      await connection.query('COMMIT');
      return employee;
    } catch (error: unknown) {
      await connection.query('ROLLBACK');
      throw translateDatabaseError(error);
    } finally {
      connection.release();
    }
  }

  async updateStatus(
    employeeCode: string,
    status: EmployeeStatus,
  ): Promise<Employee> {
    const connection = await this.pool.connect();

    try {
      await connection.query('BEGIN');
      await connection.query('SELECT pg_advisory_xact_lock($1)', [
        SUPER_ADMIN_INVARIANT_LOCK,
      ]);

      const found = await connection.query<{
        id: number;
        status: EmployeeStatus;
        isSuperAdmin: boolean;
      }>(
        `SELECT e."id", e."status",
                EXISTS (
                  SELECT 1 FROM "EmployeeRole" er
                  JOIN "Role" r ON r."id" = er."roleId"
                  WHERE er."employeeId" = e."id" AND r."isSystem"
                ) AS "isSuperAdmin"
         FROM "Employee" e
         WHERE e."employeeCode" = $1
         FOR UPDATE OF e`,
        [employeeCode],
      );

      const current = found.rows[0];

      if (!current) {
        throw new NotFoundException('Employee not found');
      }

      if (
        current.isSuperAdmin &&
        current.status === 'Active' &&
        status === 'Inactive'
      ) {
        const others = await connection.query<{ count: string }>(
          `SELECT COUNT(DISTINCT e."id") AS "count"
           FROM "Employee" e
           JOIN "EmployeeRole" er ON er."employeeId" = e."id"
           JOIN "Role" r ON r."id" = er."roleId"
           WHERE r."isSystem" AND e."status" = 'Active' AND e."id" <> $1`,
          [current.id],
        );

        if (Number(others.rows[0].count) === 0) {
          throw new BadRequestException(
            'At least one active Super Admin must remain',
          );
        }
      }

      await connection.query(
        `UPDATE "Employee" SET "status" = $1, "updatedAt" = NOW()
         WHERE "id" = $2`,
        [status, current.id],
      );

      const employee = await this.findById(connection, current.id);

      await connection.query('COMMIT');
      return employee;
    } catch (error: unknown) {
      await connection.query('ROLLBACK');
      throw translateDatabaseError(error);
    } finally {
      connection.release();
    }
  }

  private async findById(
    connection: PoolClient,
    id: number,
  ): Promise<Employee> {
    const result = await connection.query<Employee>(
      `${SELECT_EMPLOYEES} WHERE e."id" = $1 GROUP BY e."id"`,
      [id],
    );

    return result.rows[0];
  }
}

// Turn the Postgres errors a client can cause into 4xx responses; anything
// else stays a 500.
function translateDatabaseError(error: unknown): unknown {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;

  switch (code) {
    case '23505': // unique_violation
      return new ConflictException('Employee code or email already exists');
    case '23503': // foreign_key_violation — a role vanished mid-request
      return new BadRequestException('One or more roles do not exist');
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow, e.g. 2026-02-31
      return new BadRequestException('joinedDate is not a valid date');
    default:
      return error;
  }
}
