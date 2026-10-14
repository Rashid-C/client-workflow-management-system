import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { problem } from '../common/errors.js';
import type { Pool, PoolClient } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
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
const INVALID_LOGIN = problem('auth.invalid_login', 'Email or password is incorrect');

export interface LoginResult {
  token: string;
  expiresAt: Date;
  user: AuthUser;
}

interface Account {
  employeeId: number;
  employeeCode: string;
  name: string;
  status: string;
  passwordHash: string | null;
  lockedUntil: Date | null;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  /**
   * `context` carries the request's IP and browser; its actor is ignored,
   * because nobody is signed in yet.
   */
  async login(
    email: string,
    password: string,
    context: AuditContext,
  ): Promise<LoginResult> {
    const found = await this.pool.query<Account>(
      `SELECT e."id" AS "employeeId", e."employeeCode", e."name", e."status",
              c."passwordHash", c."lockedUntil"
       FROM "Employee" e
       LEFT JOIN "EmployeeCredential" c ON c."employeeId" = e."id"
       WHERE e."email" = $1`,
      [email.trim().toLowerCase()],
    );
    const account = found.rows[0];

    // Unknown emails are not recorded: there is no account to attach them
    // to, and logging every typed address would collect needless data.
    if (!account?.passwordHash) {
      await verifyPassword(password, await getDummyHash());
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    // Whoever is typing is not known to be the employee, so failures have
    // no actor; the entity is the account that was tried.
    const anonymous: AuditContext = { ...context, actor: null };
    const failure = (reason: string) => ({
      action: 'auth.login_failed',
      entityType: 'Employee',
      entityId: account.employeeId,
      summary: `Failed sign-in to ${account.name} (${account.employeeCode})`,
      reason,
    });

    if (account.lockedUntil && account.lockedUntil.getTime() > Date.now()) {
      await this.audit.record(this.pool, anonymous, failure('Account locked'));
      throw new HttpException(
        problem('auth.locked', 'Too many failed sign-in attempts. Try again in 15 minutes.'),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!(await verifyPassword(password, account.passwordHash))) {
      await this.transaction(async (db) => {
        const lockedNow = await this.recordFailedAttempt(db, account.employeeId);
        await this.audit.record(db, anonymous, failure('Wrong password'));
        if (lockedNow) {
          await this.audit.record(db, anonymous, {
            action: 'auth.account_locked',
            entityType: 'Employee',
            entityId: account.employeeId,
            summary: `Locked ${account.name} (${account.employeeCode}) for 15 minutes after ${LOGIN_MAX_FAILED_ATTEMPTS} failed sign-ins`,
          });
        }
      });
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    if (account.status !== 'Active') {
      await this.audit.record(this.pool, anonymous, failure('Account inactive'));
      throw new UnauthorizedException(INVALID_LOGIN);
    }

    // Always a fresh session on sign-in, so a planted cookie is never adopted.
    const token = newSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_ABSOLUTE_MS);
    const rehashed = needsRehash(account.passwordHash)
      ? await hashPassword(password)
      : null;

    await this.transaction(async (db) => {
      await db.query(
        `UPDATE "EmployeeCredential"
         SET "failedAttempts" = 0, "lockedUntil" = NULL,
             "passwordHash" = COALESCE($2, "passwordHash"), "updatedAt" = NOW()
         WHERE "employeeId" = $1`,
        [account.employeeId, rehashed],
      );
      await db.query(
        `DELETE FROM "Session" WHERE "employeeId" = $1 AND "expiresAt" <= NOW()`,
        [account.employeeId],
      );
      await db.query(
        `INSERT INTO "Session"
          ("tokenHash", "employeeId", "expiresAt", "ipAddress", "userAgent")
         VALUES ($1, $2, $3, $4, $5)`,
        [
          hashSessionToken(token),
          account.employeeId,
          expiresAt,
          context.ipAddress ?? null,
          context.userAgent?.slice(0, 500) ?? null,
        ],
      );
      await this.audit.record(
        db,
        { ...context, actor: { employeeId: account.employeeId, name: account.name } },
        {
          action: 'auth.login',
          entityType: 'Employee',
          entityId: account.employeeId,
          summary: `${account.name} signed in`,
        },
      );
    });

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
              e."preferredLanguage",
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

  /** A personal display preference, so it is not written to the audit log. */
  async setLanguage(user: AuthUser, language: 'en' | 'ar'): Promise<void> {
    await this.pool.query(
      `UPDATE "Employee" SET "preferredLanguage" = $2, "updatedAt" = NOW() WHERE "id" = $1`,
      [user.employeeId, language],
    );
  }

  async logout(user: AuthUser, context: AuditContext): Promise<void> {
    await this.transaction(async (db) => {
      await db.query(`DELETE FROM "Session" WHERE "id" = $1`, [user.sessionId]);
      await this.audit.record(db, context, {
        action: 'auth.logout',
        entityType: 'Employee',
        entityId: user.employeeId,
        summary: `${user.name} signed out`,
      });
    });
  }

  async changePassword(
    user: AuthUser,
    currentPassword: string,
    newPassword: string,
    context: AuditContext,
  ): Promise<void> {
    const found = await this.pool.query<{ passwordHash: string }>(
      `SELECT "passwordHash" FROM "EmployeeCredential" WHERE "employeeId" = $1`,
      [user.employeeId],
    );
    const stored = found.rows[0]?.passwordHash;

    if (!stored || !(await verifyPassword(currentPassword, stored))) {
      throw new BadRequestException(problem('auth.current_password_incorrect', 'Current password is incorrect'));
    }
    if (newPassword === currentPassword) {
      throw new BadRequestException(
        problem('auth.password_unchanged', 'New password must differ from the current one'),
      );
    }
    if (newPassword.trim().toLowerCase() === user.email.toLowerCase()) {
      throw new BadRequestException(problem('auth.password_is_email', 'Password must not be your email'));
    }

    const newHash = await hashPassword(newPassword);

    await this.transaction(async (db) => {
      await db.query(
        `UPDATE "EmployeeCredential"
         SET "passwordHash" = $2, "mustChangePassword" = false,
             "passwordChangedAt" = NOW(), "updatedAt" = NOW()
         WHERE "employeeId" = $1`,
        [user.employeeId, newHash],
      );
      // Sign out every other device that knew the old password.
      await db.query(
        `DELETE FROM "Session" WHERE "employeeId" = $1 AND "id" <> $2`,
        [user.employeeId, user.sessionId],
      );
      await this.audit.record(db, context, {
        action: 'auth.password_changed',
        entityType: 'Employee',
        entityId: user.employeeId,
        summary: user.mustChangePassword
          ? `${user.name} replaced their temporary password`
          : `${user.name} changed their password`,
      });
    });
  }

  /** Returns true when this failure is the one that locks the account. */
  private async recordFailedAttempt(
    db: PoolClient,
    employeeId: number,
  ): Promise<boolean> {
    // A lock that has already run out starts a fresh count.
    const result = await db.query<{ lockedNow: boolean }>(
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
       WHERE "employeeId" = $1
       RETURNING ("lockedUntil" IS NOT NULL) AS "lockedNow"`,
      [employeeId, LOGIN_MAX_FAILED_ATTEMPTS, LOGIN_LOCKOUT_MS / 1000],
    );
    return result.rows[0]?.lockedNow ?? false;
  }

  private async transaction(work: (db: PoolClient) => Promise<void>) {
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      await work(connection);
      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      throw error;
    } finally {
      connection.release();
    }
  }
}
