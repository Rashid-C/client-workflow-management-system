import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { AuditService } from './audit.service.js';

describe('AuditService', () => {
  let service: AuditService;
  let pool: { query: ReturnType<typeof vi.fn> };

  const viewer = (scope: 'own' | 'all'): AuthUser => ({
    sessionId: 1,
    employeeId: 4,
    employeeCode: 'EMP-004',
    name: 'Viewer',
    email: 'viewer@firm.ae',
    isSuperAdmin: false,
    mustChangePassword: false,
    preferredLanguage: 'en',
    emailNotificationsEnabled: true,
    permissions: { 'history.view': scope },
  });

  const lastCall = () => pool.query.mock.calls.at(-1) as [string, unknown[]];

  beforeEach(async () => {
    pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuditService, { provide: POSTGRES_POOL, useValue: pool }],
    }).compile();
    service = module.get(AuditService);
  });

  describe('record', () => {
    it('writes on the connection it is given, with the actor and request details', async () => {
      const connection = { query: vi.fn().mockResolvedValue({}) };

      await service.record(
        connection,
        {
          actor: { employeeId: 1, name: 'Maria Manager' },
          ipAddress: '10.0.0.5',
          userAgent: 'x'.repeat(600),
        },
        {
          action: 'employee.status_changed',
          entityType: 'Employee',
          entityId: 9,
          summary: 'Marked Sam inactive',
          changes: { status: { from: 'Active', to: 'Inactive' } },
        },
      );

      expect(pool.query).not.toHaveBeenCalled();
      const [sql, params] = connection.query.mock.calls[0];
      expect(sql).toContain('INSERT INTO "AuditLog"');
      expect(params).toEqual([
        1,
        'Maria Manager',
        'employee.status_changed',
        'Employee',
        '9',
        'Marked Sam inactive',
        '{"status":{"from":"Active","to":"Inactive"}}',
        null,
        '10.0.0.5',
        'x'.repeat(500),
      ]);
    });

    it('allows entries without an actor', async () => {
      const connection = { query: vi.fn().mockResolvedValue({}) };

      await service.record(connection, { actor: null }, {
        action: 'auth.login_failed',
        entityType: 'Employee',
        entityId: 3,
        summary: 'Failed sign-in',
        reason: 'Wrong password',
      });

      const [, params] = connection.query.mock.calls[0];
      expect(params.slice(0, 2)).toEqual([null, null]);
      expect(params[6]).toBeNull();
      expect(params[7]).toBe('Wrong password');
    });
  });

  describe('list', () => {
    it('shows everything, newest first, to "all" scope', async () => {
      await service.list(viewer('all'), {});

      const [sql, params] = lastCall();
      expect(sql).not.toContain('WHERE');
      expect(sql).toContain('ORDER BY "id" DESC');
      expect(params).toEqual([51]);
    });

    it('limits "own" scope to what you did and what was done to you', async () => {
      await service.list(viewer('own'), {});

      const [sql, params] = lastCall();
      expect(sql).toContain('"actorEmployeeId" = $1 OR ("entityType" = \'Employee\' AND "entityId" = $1::text)');
      expect(params[0]).toBe(4);
    });

    it('applies filters as bound parameters, never as SQL text', async () => {
      await service.list(viewer('all'), {
        entityType: 'Employee',
        entityId: "9'; DROP TABLE x; --",
        actorEmployeeId: 2,
        action: 'employee.created',
        from: '2026-10-01',
        to: '2026-10-31',
        before: 500,
        limit: 20,
      });

      const [sql, params] = lastCall();
      expect(sql).not.toContain('DROP TABLE');
      expect(sql).toContain('AT TIME ZONE');
      expect(params).toEqual([
        'Employee',
        "9'; DROP TABLE x; --",
        2,
        'employee.created',
        '2026-10-01',
        'Asia/Dubai',
        '2026-10-31',
        'Asia/Dubai',
        500,
        21,
      ]);
    });

    it('returns a cursor only when there is an older page', async () => {
      const rows = (n: number) =>
        Array.from({ length: n }, (_, i) => ({ id: 100 - i }));

      pool.query.mockResolvedValueOnce({ rows: rows(3) });
      await expect(service.list(viewer('all'), { limit: 2 })).resolves.toEqual({
        items: rows(2),
        nextBefore: 99,
      });

      pool.query.mockResolvedValueOnce({ rows: rows(2) });
      await expect(service.list(viewer('all'), { limit: 2 })).resolves.toEqual({
        items: rows(2),
        nextBefore: null,
      });
    });

    it('answers 400 for an impossible date', async () => {
      pool.query.mockRejectedValueOnce({ code: '22008' });

      await expect(
        service.list(viewer('all'), { from: '2026-02-31' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
