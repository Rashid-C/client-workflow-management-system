import type { AuditContext } from '../audit/audit.service.js';
import { SmtpMailer } from './mailer.js';
import {
  DOCUMENT_REMINDERS_SQL,
  LEAD_REMINDERS_SQL,
  NotificationsService,
  TASK_REMINDERS_SQL,
} from './notifications.service.js';

const context: AuditContext = { actor: { employeeId: 4, name: 'Aisha' } };

describe('NotificationsService', () => {
  it('selects office-day expiring/expired documents, due open leads, and overdue open task stages', () => {
    expect(DOCUMENT_REMINDERS_SQL).toContain("d.\"expiryDate\" < today.day THEN 'document_expired'");
    expect(DOCUMENT_REMINDERS_SQL).toContain("'documents.view' AND rp.\"scope\" = 'all'");
    expect(DOCUMENT_REMINDERS_SQL).toContain("(now() AT TIME ZONE 'Asia/Dubai')::date");
    expect(LEAD_REMINDERS_SQL).toContain("l.\"status\" IN ('New', 'Contacted', 'Proposal sent')");
    expect(LEAD_REMINDERS_SQL).toContain('l."nextFollowUpDate" <=');
    expect(TASK_REMINDERS_SQL).toContain('s."status" <> \'Completed\'');
    expect(TASK_REMINDERS_SQL).toContain('t."status" <> \'Completed\'');
    expect(TASK_REMINDERS_SQL).toContain('s."assigneeId" AS "employeeId"');
  });

  it('does not create the same daily reminder twice', async () => {
    const created = new Set<string>();
    const attempts: unknown[][] = [];
    const pool = {
      query: vi.fn(async (sql: string, _params: unknown[] = []) => {
        if (sql.includes('::date::text AS day')) return { rows: [{ day: '2026-10-19' }] };
        if (sql === DOCUMENT_REMINDERS_SQL) return { rows: [{ id: 1, employeeId: 4, preferredLanguage: 'en', kind: 'document_expiring', type: 'Tax certificate', title: null, clientName: 'Al Noor', day: '2026-10-19' }] };
        if (sql === LEAD_REMINDERS_SQL) return { rows: [{ id: 2, employeeId: 4, preferredLanguage: 'en', name: 'Prospect', nextFollowUpDate: '2026-10-19' }] };
        if (sql === TASK_REMINDERS_SQL) return { rows: [{ id: 3, employeeId: 4, preferredLanguage: 'en', title: 'Audit file' }] };
        throw new Error(`unexpected SQL: ${sql}`);
      }),
      connect: vi.fn(async () => ({
        query: vi.fn(async (sql: string, params: unknown[] = []) => {
          if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') return {};
          attempts.push(params);
          const key = `${String(params[0])}:${String(params[5])}`;
          if (created.has(key)) return { rows: [] };
          created.add(key);
          return { rows: [{ id: created.size }] };
        }),
        release: vi.fn(),
      })),
    };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new NotificationsService(pool as never, { enabled: false, sendDigest: vi.fn() }, audit as never);

    await service.createDailyReminders();
    await service.createDailyReminders();

    expect(created.size).toBe(3);
    expect(attempts).toHaveLength(6);
    expect(audit.record).toHaveBeenCalledTimes(3);
  });

  it('scopes notification reads and lists to the current employee', async () => {
    const db = {
      query: vi.fn(async (sql: string, _params: unknown[] = []) => sql === 'BEGIN' || sql === 'ROLLBACK' || sql === 'COMMIT' ? {} : ({ rows: [] })),
      release: vi.fn(),
    };
    const pool = { query: vi.fn(async (sql: string, _params: unknown[] = []) => {
      if (sql.includes('FROM "Notification"')) return { rows: [] };
      throw new Error(`unexpected SQL: ${sql}`);
    }), connect: vi.fn().mockResolvedValue(db) };
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const service = new NotificationsService(pool as never, { enabled: false, sendDigest: vi.fn() }, audit as never);

    await service.list(4);
    expect(pool.query.mock.calls[0][0]).toContain('WHERE "employeeId" = $1');
    expect(pool.query.mock.calls[0]?.[1]?.[0]).toBe(4);

    await expect(service.markRead(4, 8, context)).rejects.toMatchObject({ response: { code: 'notifications.not_found' } });
    expect(db.query.mock.calls[1][0]).toContain('WHERE "id" = $1 AND "employeeId" = $2');
    expect(db.query.mock.calls[1][1]).toEqual([8, 4]);
  });
});

describe('SmtpMailer', () => {
  it('leaves in-app notifications usable when MAIL_HOST is absent', async () => {
    const previous = process.env['MAIL_HOST'];
    delete process.env['MAIL_HOST'];
    const mailer = new SmtpMailer();
    mailer.onModuleInit();
    await expect(mailer.sendDigest('person@example.com', 'en', [])).resolves.toBeUndefined();
    expect(mailer.enabled).toBe(false);
    if (previous !== undefined) process.env['MAIL_HOST'] = previous;
  });
});
