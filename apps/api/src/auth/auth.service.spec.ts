import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { PERMISSIONS } from '../roles/permissions.js';
import { AuthService } from './auth.service.js';
import { hashPassword } from './password.js';
import { hashSessionToken, type AuthUser } from './session.js';

const PASSWORD = 'correct horse battery';

describe('AuthService', () => {
  let service: AuthService;
  let pool: {
    query: ReturnType<typeof vi.fn>;
    connect: ReturnType<typeof vi.fn>;
  };
  let connection: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
  let record: ReturnType<typeof vi.fn>;
  let storedHash: string;

  const context: AuditContext = {
    actor: null,
    ipAddress: '10.0.0.5',
    userAgent: 'Firefox',
  };

  const sessionRow = (overrides: Partial<AuthUser> = {}) => ({
    sessionId: 11,
    employeeId: 3,
    employeeCode: 'EMP-003',
    name: 'Sam Senior',
    email: 'sam@firm.ae',
    isSuperAdmin: false,
    mustChangePassword: false,
    permissions: { 'tasks.view': 'own' },
    lastSeenAt: new Date(),
    ...overrides,
  });

  const account = (overrides = {}) => ({
    employeeId: 3,
    employeeCode: 'EMP-003',
    name: 'Sam Senior',
    status: 'Active',
    passwordHash: storedHash,
    lockedUntil: null,
    ...overrides,
  });

  const poolSql = () => pool.query.mock.calls.map(([sql]) => String(sql));
  const txSql = () => connection.query.mock.calls.map(([sql]) => String(sql));
  const actions = () => record.mock.calls.map(([, , entry]) => entry.action);

  beforeAll(async () => {
    storedHash = await hashPassword(PASSWORD);
  });

  beforeEach(async () => {
    connection = { query: vi.fn().mockResolvedValue({ rows: [] }), release: vi.fn() };
    pool = { query: vi.fn(), connect: vi.fn().mockResolvedValue(connection) };
    record = vi.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: POSTGRES_POOL, useValue: pool },
        { provide: AuditService, useValue: { record } },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    it('gives an unknown email the same answer as a wrong password, and records nothing', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const error = await service
        .login('nobody@firm.ae', PASSWORD, context)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as Error).message).toBe('Email or password is incorrect');
      expect(pool.connect).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('counts a wrong password and records the failure without an actor', async () => {
      pool.query.mockResolvedValueOnce({ rows: [account()] });
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ lockedNow: false }] }) // failed attempt
        .mockResolvedValueOnce({}); // COMMIT

      const error = await service
        .login('sam@firm.ae', 'wrong password!', context)
        .catch((e: unknown) => e);

      expect((error as Error).message).toBe('Email or password is incorrect');
      expect(txSql()[1]).toContain('"failedAttempts"');
      expect(connection.query.mock.calls[1][1]).toEqual([3, 5, 900]);
      expect(actions()).toEqual(['auth.login_failed']);
      const [db, auditContext, entry] = record.mock.calls[0];
      expect(db).toBe(connection);
      expect(auditContext.actor).toBeNull();
      expect(auditContext.ipAddress).toBe('10.0.0.5');
      expect(entry).toMatchObject({ entityId: 3, reason: 'Wrong password' });
      expect(txSql().at(-1)).toBe('COMMIT');
    });

    it('records the lock on the failure that triggers it', async () => {
      pool.query.mockResolvedValueOnce({ rows: [account()] });
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ lockedNow: true }] })
        .mockResolvedValueOnce({}); // COMMIT

      await service.login('sam@firm.ae', 'wrong password!', context).catch(() => {});

      expect(actions()).toEqual(['auth.login_failed', 'auth.account_locked']);
    });

    it('refuses a locked account with 429 before checking the password', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [account({ lockedUntil: new Date(Date.now() + 60_000) })],
      });

      const error = await service
        .login('sam@firm.ae', PASSWORD, context)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      expect(pool.connect).not.toHaveBeenCalled();
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'auth.login_failed',
        reason: 'Account locked',
      });
    });

    it('treats an inactive account like a wrong password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [account({ status: 'Inactive' })] });

      await expect(
        service.login('sam@firm.ae', PASSWORD, context),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(pool.connect).not.toHaveBeenCalled();
      expect(record.mock.calls[0][2].reason).toBe('Account inactive');
    });

    it('opens a session in one transaction, storing only the token hash', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [account()] }) // account
        .mockResolvedValueOnce({ rows: [sessionRow()] }); // authenticate

      const result = await service.login(' SAM@FIRM.AE ', PASSWORD, context);

      expect(pool.query.mock.calls[0][1]).toEqual(['sam@firm.ae']);
      expect(txSql()[0]).toBe('BEGIN');
      expect(txSql()[1]).toContain('"failedAttempts" = 0');
      const insert = connection.query.mock.calls.find(([sql]) =>
        String(sql).includes('INSERT INTO "Session"'),
      )!;
      expect(insert[1][0]).toBe(hashSessionToken(result.token));
      expect(insert[1]).not.toContain(result.token);
      expect(insert[1].slice(1)).toEqual([3, result.expiresAt, '10.0.0.5', 'Firefox']);
      expect(txSql().at(-1)).toBe('COMMIT');

      expect(actions()).toEqual(['auth.login']);
      expect(record.mock.calls[0][1].actor).toEqual({ employeeId: 3, name: 'Sam Senior' });
      expect(result.expiresAt.getTime() - Date.now()).toBeGreaterThan(11.9 * 3600_000);
      expect(result.user.employeeId).toBe(3);
    });

    it('rolls the session back if the audit entry cannot be written', async () => {
      pool.query.mockResolvedValueOnce({ rows: [account()] });
      record.mockRejectedValueOnce(new Error('disk full'));

      await expect(service.login('sam@firm.ae', PASSWORD, context)).rejects.toThrow(
        'disk full',
      );
      expect(txSql().at(-1)).toBe('ROLLBACK');
      expect(txSql()).not.toContain('COMMIT');
    });
  });

  describe('authenticate', () => {
    it('returns null for an unknown, expired or idle session', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });
      await expect(service.authenticate('token')).resolves.toBeNull();
      expect(pool.query.mock.calls[0][1]).toEqual([hashSessionToken('token'), 7200]);
    });

    it('gives a Super Admin every permission at "all"', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [sessionRow({ isSuperAdmin: true, permissions: {} })],
      });

      const user = await service.authenticate('token');

      expect(Object.keys(user!.permissions)).toHaveLength(PERMISSIONS.length);
      expect(Object.values(user!.permissions).every((s) => s === 'all')).toBe(true);
    });

    it('touches lastSeenAt only after a minute has passed', async () => {
      pool.query.mockResolvedValueOnce({ rows: [sessionRow()] });
      await service.authenticate('token');
      expect(pool.query).toHaveBeenCalledOnce();

      pool.query
        .mockResolvedValueOnce({
          rows: [sessionRow({ lastSeenAt: new Date(Date.now() - 5 * 60_000) } as never)],
        })
        .mockResolvedValueOnce({});
      await service.authenticate('token');
      expect(poolSql().at(-1)).toContain('"lastSeenAt" = NOW()');
    });
  });

  describe('logout', () => {
    it('deletes the session and records it together', async () => {
      const user = sessionRow() as unknown as AuthUser;

      await service.logout(user, { ...context, actor: { employeeId: 3, name: 'Sam Senior' } });

      expect(txSql()[1]).toContain('DELETE FROM "Session"');
      expect(connection.query.mock.calls[1][1]).toEqual([11]);
      expect(actions()).toEqual(['auth.logout']);
      expect(record.mock.calls[0][0]).toBe(connection);
    });
  });

  describe('changePassword', () => {
    const user = sessionRow({ mustChangePassword: true }) as unknown as AuthUser;

    it('rejects a wrong current password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ passwordHash: storedHash }] });

      await expect(
        service.changePassword(user, 'not it at all', 'brand new password', context),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(pool.connect).not.toHaveBeenCalled();
      expect(record).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ passwordHash: storedHash }] });

      await expect(
        service.changePassword(user, PASSWORD, PASSWORD, context),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores the new hash, signs out other sessions and records the change', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ passwordHash: storedHash }] });

      await service.changePassword(user, PASSWORD, 'brand new password', context);

      expect(txSql()[0]).toBe('BEGIN');
      expect(txSql()[1]).toContain('"mustChangePassword" = false');
      expect(connection.query.mock.calls[1][1][1]).toMatch(/^\$argon2id\$/);
      expect(txSql()[2]).toContain('DELETE FROM "Session"');
      expect(connection.query.mock.calls[2][1]).toEqual([3, 11]);
      expect(txSql()[3]).toBe('COMMIT');
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'auth.password_changed',
        summary: 'Sam Senior replaced their temporary password',
      });
      expect(connection.release).toHaveBeenCalledOnce();
    });
  });
});
