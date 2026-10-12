import {
  BadRequestException,
  HttpException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
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
  let storedHash: string;

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

  const sqlCalls = () => pool.query.mock.calls.map(([sql]) => String(sql));

  beforeAll(async () => {
    storedHash = await hashPassword(PASSWORD);
  });

  beforeEach(async () => {
    connection = { query: vi.fn().mockResolvedValue({}), release: vi.fn() };
    pool = { query: vi.fn(), connect: vi.fn().mockResolvedValue(connection) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: POSTGRES_POOL, useValue: pool }],
    }).compile();

    service = module.get(AuthService);
  });

  describe('login', () => {
    const account = (overrides = {}) => ({
      employeeId: 3,
      status: 'Active',
      passwordHash: storedHash,
      lockedUntil: null,
      ...overrides,
    });

    it('gives an unknown email the same answer as a wrong password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [] });

      const error = await service
        .login('nobody@firm.ae', PASSWORD, {})
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect((error as Error).message).toBe('Email or password is incorrect');
      expect(sqlCalls().some((sql) => sql.includes('INSERT INTO "Session"'))).toBe(false);
    });

    it('counts a wrong password and answers generically', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [account()] })
        .mockResolvedValueOnce({}); // failed-attempt update

      const error = await service
        .login('sam@firm.ae', 'wrong password!', {})
        .catch((e: unknown) => e);

      expect((error as Error).message).toBe('Email or password is incorrect');
      expect(sqlCalls()[1]).toContain('"failedAttempts"');
      expect(pool.query.mock.calls[1][1]).toEqual([3, 5, 900]);
    });

    it('refuses a locked account with 429 before checking the password', async () => {
      pool.query.mockResolvedValueOnce({
        rows: [account({ lockedUntil: new Date(Date.now() + 60_000) })],
      });

      const error = await service
        .login('sam@firm.ae', PASSWORD, {})
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
      expect(pool.query).toHaveBeenCalledOnce();
    });

    it('treats an inactive account like a wrong password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [account({ status: 'Inactive' })] });

      await expect(
        service.login('sam@firm.ae', PASSWORD, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(sqlCalls().some((sql) => sql.includes('INSERT INTO "Session"'))).toBe(false);
    });

    it('opens a session, storing only the token hash', async () => {
      pool.query
        .mockResolvedValueOnce({ rows: [account()] }) // account
        .mockResolvedValueOnce({}) // reset attempts
        .mockResolvedValueOnce({}) // purge expired sessions
        .mockResolvedValueOnce({}) // insert session
        .mockResolvedValueOnce({ rows: [sessionRow()] }); // authenticate

      const result = await service.login(' SAM@FIRM.AE ', PASSWORD, {
        ipAddress: '10.0.0.5',
        userAgent: 'Firefox',
      });

      expect(pool.query.mock.calls[0][1]).toEqual(['sam@firm.ae']);
      const [, insertParams] = pool.query.mock.calls[3];
      expect(insertParams[0]).toBe(hashSessionToken(result.token));
      expect(insertParams).not.toContain(result.token);
      expect(insertParams.slice(1)).toEqual([3, result.expiresAt, '10.0.0.5', 'Firefox']);
      expect(result.expiresAt.getTime() - Date.now()).toBeGreaterThan(11.9 * 3600_000);
      expect(result.user.employeeId).toBe(3);
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
      expect(sqlCalls().at(-1)).toContain('"lastSeenAt" = NOW()');
    });
  });

  describe('changePassword', () => {
    const user = sessionRow() as unknown as AuthUser;

    it('rejects a wrong current password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ passwordHash: storedHash }] });

      await expect(
        service.changePassword(user, 'not it at all', 'brand new password'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it('rejects reusing the current password', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ passwordHash: storedHash }] });

      await expect(
        service.changePassword(user, PASSWORD, PASSWORD),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores the new hash and signs out other sessions', async () => {
      pool.query.mockResolvedValueOnce({ rows: [{ passwordHash: storedHash }] });

      await service.changePassword(user, PASSWORD, 'brand new password');

      const calls = connection.query.mock.calls.map(([sql]) => String(sql));
      expect(calls[0]).toBe('BEGIN');
      expect(calls[1]).toContain('"mustChangePassword" = false');
      expect(connection.query.mock.calls[1][1][1]).toMatch(/^\$argon2id\$/);
      expect(calls[2]).toContain('DELETE FROM "Session"');
      expect(connection.query.mock.calls[2][1]).toEqual([3, 11]);
      expect(calls[3]).toBe('COMMIT');
      expect(connection.release).toHaveBeenCalledOnce();
    });
  });
});
