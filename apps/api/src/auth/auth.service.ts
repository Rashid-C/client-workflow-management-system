import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../database/database.module.js';
import { PERMISSIONS } from '../roles/permissions.js';
import {
  getDummyHash,
  hashPassword,
  needsRehash,
  verifyPassword,
} from './password.js';
import {
  hashSessionToken,
  LOGIN_LOCKOUT_MS,
  LOGIN_MAX_FAILED_ATTEMPTS,
  newSessionToken,
  SESSION_ABSOLUTE_MS,
  SESSION_IDLE_MS,
  SESSION_TOUCH_MS,
  type AuthUser,
} from './session.js';

// One message for unknown email, wrong password and inactive account, so
// the login form never reveals which emails exist.
const INVALID_LOGIN = 'Email or password is incorrect';

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: AuthUser;
}

export interface ClientInfo {
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async login(
    email: string,
    password: string,
    client: ClientInfo,
  ): Promise<LoginResult> {
    const found = await this.pool.query<{
      employeeId: number;
      status: string;
      passwordHash: string | null;
      lockedUntil: Date | null;
    }>(
      `SELECT e."id" AS "employeeId", e."status",
              c."passwordHash", c."lockedUntil"
       FROM "Employee" e
       LEFT JOIN "EmployeeCredential" c ON c."employeeId" = e."id"
       WHERE e."email" = $1`,
      [email.trim().toLowerCase()],
    );
    const account = found.rows[0];

    if (!account?.passwordHash) {
      await verifyPassword(password, await getDummyHash());
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
      throw new HttpException(
        'Too many failed sign-in attempts. Try again in 15 minutes.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!(await verifyPassword(password, account.passwordHash))) {
      await this.recordFailedAttempt(account.employeeId);
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    if (account.status !== 'Active') {
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    await this.pool.query(
      `UPDATE "EmployeeCredential"
       SET "failedAttempts" = 0, "lockedUntil" = NULL,
           "passwordHash" = COALESCE($2, "passwordHash"), "updatedAt" = NOW()
       WHERE "employeeId" = $1`,
      [
        account.employeeId,
        needsRehash(account.passwordHash) ? await hashPassword(password) : null,
      ],
    );

    // Always a fresh session on sign-in, so a planted cookie is never adopted.
    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_MS);

    await this.pool.query(
      `DELETE FROM "Session" WHERE "employeeId" = $1 AND "expiresAt" <= NOW()`,
      [account.employeeId],
    );
    await this.pool.query(
      `INSERT INTO "Session"
        ("tokenHash", "employeeId", "expiresAt", "ipAddress", "userAgent")
       VALUES ($1, $2, $3, $4, $5)`,
      [
        hashSessionToken(token),
        account.employeeId,
        expiresAt,
        client.ipAddress ?? null,
        client.userAgent?.slice(0, 500) ?? null,
      ],
    );

    const user = await this.authenticate(token);
    if (!user) throw new UnauthorizedException(INVALID_LOGIN);

    return { token, expiresAt, user };
  }

  /** Resolve a cookie token to the signed-in employee, or null. */
  async authenticate(token: string): Promise<AuthUser | null> {
    const result = await this.pool.query<
      Omit<AuthUser, 'permissions'> & {
        permissions: AuthUser['permissions'];
        lastSeenAt: Date;
      }
    >(
      `SELECT s."id" AS "sessionId", s."lastSeenAt",
              e."id" AS "employeeId", e."employeeCode", e."name", e."email",
              COALESCE(c."mustChangePassword", false) AS "mustChangePassword",
              EXISTS (
                SELECT 1 FROM "EmployeeRole" er
                JOIN "Role" r ON r."id" = er."roleId"
                WHERE er."employeeId" = e."id" AND r."isSystem"
              ) AS "isSuperAdmin",
              COALESCE((
                SELECT json_object_agg(g."key", g."scope")
                FROM (
                  SELECT rp."permissionKey" AS "key",
                         CASE WHEN bool_or(rp."scope" = 'all') THEN 'all' ELSE 'own' END AS "scope"
                  FROM "EmployeeRole" er
                  JOIN "RolePermission" rp ON rp."roleId" = er."roleId"
                  WHERE er."employeeId" = e."id"
                  GROUP BY rp."permissionKey"
                ) g
              ), '{}') AS "permissions"
       FROM "Session" s
       JOIN "Employee" e ON e."id" = s."employeeId"
       LEFT JOIN "EmployeeCredential" c ON c."employeeId" = e."id"
       WHERE s."tokenHash" = $1
         AND s."expiresAt" > NOW()
         AND s."lastSeenAt" > NOW() - make_interval(secs => $2)
         AND e."status" = 'Active'`,
      [hashSessionToken(token), SESSION_IDLE_MS / 1000],
    );

    const row = result.rows[0];
    if (!row) return null;

    if (Date.now() - row.lastSeenAt.getTime() > SESSION_TOUCH_MS) {
      await this.pool.query(
        `UPDATE "Session" SET "lastSeenAt" = NOW() WHERE "id" = $1`,
        [row.sessionId],
      );
    }

    const { lastSeenAt: _lastSeenAt, ...user } = row;
    return {
      ...user,
      permissions: user.isSuperAdmin
        ? Object.fromEntries(PERMISSIONS.map((p) => [p.key, 'all']))
        : user.permissions,
    };
  }

  async logout(sessionId: number): Promise<void> {
    await this.pool.query(`DELETE FROM "Session" WHERE "id" = $1`, [sessionId]);
  }

  async changePassword(
    user: AuthUser,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const found = await this.pool.query<{ passwordHash: string }>(
      `SELECT "passwordHash" FROM "EmployeeCredential" WHERE "employeeId" = $1`,
      [user.employeeId],
    );
    const stored = found.rows[0]?.passwordHash;

    if (!stored || !(await verifyPassword(currentPassword, stored))) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (newPassword === currentPassword) {
      throw new BadRequestException(
        'New password must differ from the current one',
      );
    }
    if (newPassword.trim().toLowerCase() === user.email.toLowerCase()) {
      throw new BadRequestException('Password must not be your email');
    }

    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      await connection.query(
        `UPDATE "EmployeeCredential"
         SET "passwordHash" = $2, "mustChangePassword" = false,
             "passwordChangedAt" = NOW(), "updatedAt" = NOW()
         WHERE "employeeId" = $1`,
        [user.employeeId, await hashPassword(newPassword)],
      );
      // Sign out every other device that knew the old password.
      await connection.query(
        `DELETE FROM "Session" WHERE "employeeId" = $1 AND "id" <> $2`,
        [user.employeeId, user.sessionId],
      );
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }

  private async recordFailedAttempt(employeeId: number): Promise<void> {
    // A lock that has already run out starts a fresh count.
    await this.pool.query(
      `UPDATE "EmployeeCredential"
       SET "failedAttempts" = CASE
             WHEN "lockedUntil" IS NOT NULL AND "lockedUntil" <= NOW() THEN 1
             ELSE "failedAttempts" + 1
           END,
           "lockedUntil" = CASE
             WHEN "lockedUntil" IS NOT NULL AND "lockedUntil" <= NOW() THEN NULL
             WHEN "failedAttempts" + 1 >= $2 THEN NOW() + make_interval(secs => $3)
             ELSE "lockedUntil"
           END,
           "updatedAt" = NOW()
       WHERE "employeeId" = $1`,
      [employeeId, LOGIN_MAX_FAILED_ATTEMPTS, LOGIN_LOCKOUT_MS / 1000],
    );
  }
}
