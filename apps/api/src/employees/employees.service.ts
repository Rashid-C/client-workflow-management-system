import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { hashPassword } from '../auth/password.js';
import type { AuthUser } from '../auth/session.js';
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type {
  CreateEmployeeDto,
  EmployeeStatus,
  UpdateEmployeeDto,
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
  version: number;
  /** Stages assigned to them that are not completed, on live tasks. */
  openStages: number;
  /** Still on a temporary password. */
  mustChangePassword: boolean;
  /** Locked out after failed sign-ins. */
  isLocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Serializes every change that could leave the firm without an active
// Super Admin (status changes and role removal). Any code path that can
// reduce the number of active Super Admins must take this lock first.
export const SUPER_ADMIN_INVARIANT_LOCK = 7_301_001;
// Serializes issuing employee codes, so two new employees never share one.
export const EMPLOYEE_CODE_LOCK = 7_301_002;

// Employees with their roles in one query — no per-employee round trips.
const SELECT_EMPLOYEES = `
  SELECT e."id", e."employeeCode", e."name", e."email", e."phone",
         e."designation", e."status", e."joinedDate", e."version",
         e."createdAt", e."updatedAt",
         (SELECT count(*)::int FROM "TaskStage" s JOIN "Task" t ON t."id" = s."taskId"
          WHERE s."assigneeId" = e."id" AND s."status" <> 'Completed' AND t."archivedAt" IS NULL
         ) AS "openStages",
         COALESCE((SELECT c."mustChangePassword" FROM "EmployeeCredential" c
                   WHERE c."employeeId" = e."id"), false) AS "mustChangePassword",
         COALESCE((SELECT c."lockedUntil" > NOW() FROM "EmployeeCredential" c
                   WHERE c."employeeId" = e."id"), false) AS "isLocked",
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

const superAdminOnly = () =>
  new ForbiddenException(
    problem('employees.super_admin_only', 'Only a Super Admin can do this to a Super Admin account'),
  );

const ref = (employee: { name: string; employeeCode: string }) =>
  `${employee.name} (${employee.employeeCode})`;

@Injectable()
export class EmployeesService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async findAll(viewer: AuthUser): Promise<Employee[]> {
    // "own" scope: a person sees only their own record.
    const ownOnly = viewer.permissions['employees.view'] === 'own';
    const result = await this.pool.query<Employee>(
      `${SELECT_EMPLOYEES}
       ${ownOnly ? 'WHERE e."id" = $1' : ''}
       GROUP BY e."id" ORDER BY lower(e."name"), e."id"`,
      ownOnly ? [viewer.employeeId] : [],
    );
    return result.rows;
  }

  async findOne(viewer: AuthUser, employeeCode: string): Promise<Employee> {
    const employee = await this.findBy(this.pool, 'e."employeeCode" = $1', [employeeCode]);
    // Out of an "own" viewer's scope reads the same as not existing.
    if (!employee || (viewer.permissions['employees.view'] === 'own' && employee.id !== viewer.employeeId)) {
      throw new NotFoundException(problem('employees.not_found', 'Employee not found'));
    }
    return employee;
  }

  async create(viewer: AuthUser, data: CreateEmployeeDto, context: AuditContext): Promise<Employee> {
    // Hash before opening the transaction; argon2 takes tens of milliseconds.
    const passwordHash = await hashPassword(data.temporaryPassword);

    return this.transaction(async (db) => {
      const roles = await this.rolesById(db, data.roleIds);
      if (roles.some((role) => role.isSystem) && !viewer.isSuperAdmin) throw superAdminOnly();

      await db.query('SELECT pg_advisory_xact_lock($1)', [EMPLOYEE_CODE_LOCK]);
      const next = await db.query<{ code: string }>(
        `SELECT 'EMP-' || lpad(n::text, greatest(3, length(n::text)), '0') AS "code"
         FROM (SELECT COALESCE(max(substring("employeeCode" from 5)::int), 0) + 1 AS n
               FROM "Employee" WHERE "employeeCode" ~ '^EMP-[0-9]{1,9}$') s`,
      );

      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "Employee"
          ("employeeCode", "name", "email", "phone", "designation",
           "status", "joinedDate", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         RETURNING "id"`,
        [
          next.rows[0].code,
          data.name.trim(),
          data.email.trim().toLowerCase(),
          data.phone?.trim() || null,
          data.designation.trim(),
          data.status ?? 'Active',
          data.joinedDate,
        ],
      );
      const employeeId = inserted.rows[0].id;

      await db.query(
        `INSERT INTO "EmployeeRole" ("employeeId", "roleId") SELECT $1, unnest($2::int[])`,
        [employeeId, data.roleIds],
      );
      await db.query(
        `INSERT INTO "EmployeeCredential"
          ("employeeId", "passwordHash", "mustChangePassword", "updatedAt")
         VALUES ($1, $2, true, NOW())`,
        [employeeId, passwordHash],
      );

      const employee = (await this.findBy(db, 'e."id" = $1', [employeeId]))!;
      // Never the password, only that a temporary one was issued.
      await this.audit.record(db, context, {
        action: 'employee.created',
        entityType: 'Employee',
        entityId: employee.id,
        summary: `Added ${ref(employee)}`,
        changes: {
          employeeCode: employee.employeeCode,
          name: employee.name,
          email: employee.email,
          designation: employee.designation,
          status: employee.status,
          joinedDate: employee.joinedDate,
          roles: employee.roles.map((role) => role.name),
          temporaryPasswordIssued: true,
        },
      });
      return employee;
    });
  }

  async update(
    viewer: AuthUser,
    employeeCode: string,
    data: UpdateEmployeeDto,
    context: AuditContext,
  ): Promise<Employee> {
    return this.transaction(async (db) => {
      // Roles may change, which can remove a Super Admin.
      await db.query('SELECT pg_advisory_xact_lock($1)', [SUPER_ADMIN_INVARIANT_LOCK]);
      const current = await this.lock(db, employeeCode);
      if (current.version !== data.version) {
        throw new ConflictException(
          problem('employees.stale', 'Someone else changed this employee. Reload and make your changes again.'),
        );
      }
      const isTargetSuperAdmin = current.roles.some((role) => role.isSystem);
      if (isTargetSuperAdmin && !viewer.isSuperAdmin) throw superAdminOnly();

      const nextRoles = await this.rolesById(db, data.roleIds);
      const before = new Set(current.roles.map((role) => role.id));
      const after = new Set(nextRoles.map((role) => role.id));
      const rolesChanged = before.size !== after.size || [...after].some((id) => !before.has(id));

      if (rolesChanged) {
        if (current.id === viewer.employeeId) {
          throw new BadRequestException(
            problem('employees.cannot_change_own_roles', 'You cannot change your own roles'),
          );
        }
        const willBeSuperAdmin = nextRoles.some((role) => role.isSystem);
        if (willBeSuperAdmin !== isTargetSuperAdmin && !viewer.isSuperAdmin) throw superAdminOnly();
        if (isTargetSuperAdmin && !willBeSuperAdmin && current.status === 'Active') {
          await this.assertAnotherSuperAdmin(db, current.id);
        }
      }

      const next = {
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone?.trim() || null,
        designation: data.designation.trim(),
        joinedDate: data.joinedDate,
      };
      const changes: Record<string, unknown> = {};
      for (const field of ['name', 'email', 'phone', 'designation', 'joinedDate'] as const) {
        if (current[field] !== next[field]) changes[field] = { from: current[field], to: next[field] };
      }
      if (rolesChanged) {
        changes['roles'] = {
          from: current.roles.map((role) => role.name).join(', '),
          to: nextRoles.map((role) => role.name).sort().join(', '),
        };
      }
      if (!Object.keys(changes).length) return current;

      await db.query(
        `UPDATE "Employee"
         SET "name" = $2, "email" = $3, "phone" = $4, "designation" = $5, "joinedDate" = $6,
             "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [current.id, next.name, next.email, next.phone, next.designation, next.joinedDate],
      );
      if (rolesChanged) {
        await db.query(
          `DELETE FROM "EmployeeRole" WHERE "employeeId" = $1 AND NOT ("roleId" = ANY($2::int[]))`,
          [current.id, data.roleIds],
        );
        await db.query(
          `INSERT INTO "EmployeeRole" ("employeeId", "roleId")
           SELECT $1, unnest($2::int[]) ON CONFLICT ("employeeId", "roleId") DO NOTHING`,
          [current.id, data.roleIds],
        );
      }

      const employee = (await this.findBy(db, 'e."id" = $1', [current.id]))!;
      await this.audit.record(db, context, {
        action: 'employee.updated',
        entityType: 'Employee',
        entityId: employee.id,
        summary: `Edited ${ref(employee)}`,
        changes,
      });
      return employee;
    });
  }

  async updateStatus(
    viewer: AuthUser,
    employeeCode: string,
    status: EmployeeStatus,
    context: AuditContext,
  ): Promise<Employee> {
    return this.transaction(async (db) => {
      await db.query('SELECT pg_advisory_xact_lock($1)', [SUPER_ADMIN_INVARIANT_LOCK]);
      const current = await this.lock(db, employeeCode);
      // Nothing changes, so nothing is recorded.
      if (current.status === status) return current;

      if (current.id === viewer.employeeId && status === 'Inactive') {
        throw new BadRequestException(
          problem('employees.cannot_deactivate_self', 'You cannot deactivate yourself'),
        );
      }
      const isTargetSuperAdmin = current.roles.some((role) => role.isSystem);
      if (isTargetSuperAdmin && !viewer.isSuperAdmin) throw superAdminOnly();
      if (isTargetSuperAdmin && status === 'Inactive') {
        await this.assertAnotherSuperAdmin(db, current.id);
      }

      await db.query(
        `UPDATE "Employee" SET "status" = $1, "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $2`,
        [status, current.id],
      );
      // A deactivated person is signed out everywhere, immediately.
      if (status === 'Inactive') {
        await db.query(`DELETE FROM "Session" WHERE "employeeId" = $1`, [current.id]);
      }

      const employee = (await this.findBy(db, 'e."id" = $1', [current.id]))!;
      await this.audit.record(db, context, {
        action: 'employee.status_changed',
        entityType: 'Employee',
        entityId: employee.id,
        summary: `Marked ${ref(employee)} ${status.toLowerCase()}`,
        changes: { status: { from: current.status, to: status } },
      });
      return employee;
    });
  }

  /**
   * Issue a new temporary password. The person must replace it at their next
   * sign-in; any lock-out is lifted and every session they have is ended.
   */
  async resetPassword(
    viewer: AuthUser,
    employeeCode: string,
    temporaryPassword: string,
    context: AuditContext,
  ): Promise<Employee> {
    const passwordHash = await hashPassword(temporaryPassword);
    return this.transaction(async (db) => {
      const current = await this.lock(db, employeeCode);
      if (current.id === viewer.employeeId) {
        throw new BadRequestException(
          problem('employees.cannot_reset_own_password', 'Use "Change password" for your own account'),
        );
      }
      if (current.roles.some((role) => role.isSystem) && !viewer.isSuperAdmin) throw superAdminOnly();

      await db.query(
        `INSERT INTO "EmployeeCredential"
           ("employeeId", "passwordHash", "mustChangePassword", "updatedAt")
         VALUES ($1, $2, true, NOW())
         ON CONFLICT ("employeeId") DO UPDATE
         SET "passwordHash" = EXCLUDED."passwordHash", "mustChangePassword" = true,
             "failedAttempts" = 0, "lockedUntil" = NULL,
             "passwordChangedAt" = NOW(), "updatedAt" = NOW()`,
        [current.id, passwordHash],
      );
      await db.query(`DELETE FROM "Session" WHERE "employeeId" = $1`, [current.id]);

      // Never the password itself.
      await this.audit.record(db, context, {
        action: 'employee.password_reset',
        entityType: 'Employee',
        entityId: current.id,
        summary: `Issued a temporary password to ${ref(current)}`,
        changes: { temporaryPasswordIssued: true, signedOutEverywhere: true },
      });
      return (await this.findBy(db, 'e."id" = $1', [current.id]))!;
    });
  }

  /** The employee, row-locked, or 404. */
  private async lock(db: PoolClient, employeeCode: string): Promise<Employee> {
    const locked = await db.query<{ id: number }>(
      `SELECT "id" FROM "Employee" WHERE "employeeCode" = $1 FOR UPDATE`,
      [employeeCode],
    );
    if (!locked.rows[0]) throw new NotFoundException(problem('employees.not_found', 'Employee not found'));
    return (await this.findBy(db, 'e."id" = $1', [locked.rows[0].id]))!;
  }

  private async rolesById(db: PoolClient, ids: number[]): Promise<EmployeeRoleSummary[]> {
    const roles = await db.query<EmployeeRoleSummary>(
      `SELECT "id", "name", "isSystem" FROM "Role" WHERE "id" = ANY($1::int[]) ORDER BY "name" FOR SHARE`,
      [ids],
    );
    if (roles.rowCount !== ids.length) {
      throw new BadRequestException(problem('employees.role_missing', 'One or more roles do not exist'));
    }
    return roles.rows;
  }

  private async assertAnotherSuperAdmin(db: PoolClient, exceptId: number): Promise<void> {
    const others = await db.query<{ count: number }>(
      `SELECT COUNT(DISTINCT e."id")::int AS "count"
       FROM "Employee" e
       JOIN "EmployeeRole" er ON er."employeeId" = e."id"
       JOIN "Role" r ON r."id" = er."roleId"
       WHERE r."isSystem" AND e."status" = 'Active' AND e."id" <> $1`,
      [exceptId],
    );
    if (!others.rows[0].count) {
      throw new BadRequestException(
        problem('employees.last_super_admin', 'At least one active Super Admin must remain'),
      );
    }
  }

  private async findBy(
    db: Pick<PoolClient, 'query'>,
    where: string,
    params: unknown[],
  ): Promise<Employee | undefined> {
    const result = await db.query<Employee>(`${SELECT_EMPLOYEES} WHERE ${where} GROUP BY e."id"`, params);
    return result.rows[0];
  }

  private async transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      const result = await work(connection);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      await connection.query('ROLLBACK');
      throw translateDatabaseError(error);
    } finally {
      connection.release();
    }
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
      return new ConflictException(problem('employees.code_or_email_taken', 'Employee code or email already exists'));
    case '23503': // foreign_key_violation — a role vanished mid-request
      return new BadRequestException(problem('employees.role_missing', 'One or more roles do not exist'));
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow, e.g. 2026-02-31
      return new BadRequestException(problem('invalid_date', 'joinedDate is not a valid date'));
    default:
      return error;
  }
}
