import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { Pool } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { Mailer } from './mailer.js';
import { notificationCopy } from './notification-copy.js';

export const NOTIFICATION_KINDS = [
  'document_expiring', 'document_expired', 'lead_follow_up_due', 'task_overdue', 'stage_assigned',
] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const DOCUMENT_REMINDERS_SQL = `
  WITH today AS (SELECT (now() AT TIME ZONE 'Asia/Dubai')::date AS day), due AS (
    SELECT d."id", d."clientId", d."title", d."type", d."expiryDate",
           CASE WHEN d."expiryDate" < today.day THEN 'document_expired' ELSE 'document_expiring' END AS kind,
           c."name" AS "clientName", c."accountManagerId",
           CASE WHEN d."expiryDate" < today.day THEN 'Expired' ELSE 'Expiring soon' END AS status,
           today.day
    FROM "Document" d JOIN "Client" c ON c."id" = d."clientId" CROSS JOIN today
    WHERE d."archivedAt" IS NULL AND d."expiryDate" IS NOT NULL
      AND d."expiryDate" <= today.day + d."reminderDays"
  ), recipients AS (
    SELECT due.*, e."id" AS "employeeId", e."preferredLanguage"
    FROM due JOIN "Employee" e ON e."id" = due."accountManagerId" AND e."status" = 'Active'
    WHERE due."accountManagerId" IS NOT NULL
    UNION ALL
    SELECT due.*, e."id", e."preferredLanguage"
    FROM due JOIN "Employee" e ON e."status" = 'Active'
    WHERE due."accountManagerId" IS NULL AND EXISTS (
      SELECT 1 FROM "EmployeeRole" er JOIN "Role" r ON r."id" = er."roleId"
      LEFT JOIN "RolePermission" rp ON rp."roleId" = r."id"
      WHERE er."employeeId" = e."id"
        AND (r."isSystem" OR (rp."permissionKey" = 'documents.view' AND rp."scope" = 'all'))
    )
  )
  SELECT "employeeId", "preferredLanguage", "id", "kind", "title", "type", "clientName", "day"
  FROM recipients`;

export const LEAD_REMINDERS_SQL = `
  SELECT l."id", l."ownerId" AS "employeeId", e."preferredLanguage", l."name", l."nextFollowUpDate"
  FROM "Lead" l JOIN "Employee" e ON e."id" = l."ownerId" AND e."status" = 'Active'
  WHERE l."status" IN ('New', 'Contacted', 'Proposal sent')
    AND l."nextFollowUpDate" <= (now() AT TIME ZONE 'Asia/Dubai')::date`;

export const TASK_REMINDERS_SQL = `
  SELECT DISTINCT t."id", t."title", s."assigneeId" AS "employeeId", e."preferredLanguage"
  FROM "Task" t JOIN "TaskStage" s ON s."taskId" = t."id"
  JOIN "Employee" e ON e."id" = s."assigneeId" AND e."status" = 'Active'
  WHERE t."archivedAt" IS NULL AND t."dueDate" < (now() AT TIME ZONE 'Asia/Dubai')::date
    AND t."status" <> 'Completed' AND s."status" <> 'Completed'`;

type Reminder = {
  id: number;
  employeeId: number;
  preferredLanguage: 'en' | 'ar';
  title?: string | null;
  type?: string;
  clientName?: string;
  name?: string;
  nextFollowUpDate?: string | null;
  kind?: NotificationKind;
  status?: string;
  day?: string;
};
export type NotificationRecord = {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string;
  link: string;
  readAt: Date | null;
  createdAt: Date;
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private remindersCreatedOn: string | null = null;
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    @Inject('MAILER') private readonly mailer: Mailer,
    private readonly audit: AuditService,
  ) {}

  async list(employeeId: number, cursor?: string, limit = 50) {
    const decoded = cursor ? decodeCursor(cursor) : null;
    const result = await this.pool.query<NotificationRecord>(
      `SELECT "id", "kind", "title", "body", "link", "readAt", "createdAt"
       FROM "Notification" WHERE "employeeId" = $1 AND (
         $2::boolean IS NULL OR
         ($2::boolean AND (("readAt" IS NULL AND ("createdAt", "id") < ($3::timestamptz, $4::int)) OR "readAt" IS NOT NULL)) OR
         (NOT $2::boolean AND "readAt" IS NOT NULL AND ("createdAt", "id") < ($3::timestamptz, $4::int))
       )
       ORDER BY ("readAt" IS NULL) DESC, "createdAt" DESC, "id" DESC LIMIT $5`,
      [employeeId, decoded?.unread ?? null, decoded?.createdAt ?? null, decoded?.id ?? null, limit + 1],
    );
    const items = result.rows.slice(0, limit);
    return {
      items,
      nextCursor: result.rows.length > limit ? encodeCursor(items[items.length - 1]) : null,
    };
  }

  async unreadCount(employeeId: number) {
    const result = await this.pool.query<{ count: number }>(
      `SELECT count(*)::int AS "count" FROM "Notification" WHERE "employeeId" = $1 AND "readAt" IS NULL`,
      [employeeId],
    );
    return result.rows[0].count;
  }

  async markRead(employeeId: number, id: number, context: AuditContext) {
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const found = await db.query<NotificationRecord>(
        `SELECT "id", "kind", "title", "body", "link", "readAt", "createdAt"
         FROM "Notification" WHERE "id" = $1 AND "employeeId" = $2 FOR UPDATE`,
        [id, employeeId],
      );
      const item = found.rows[0];
      if (!item) throw new NotFoundException(problem('notifications.not_found', 'Notification not found'));
      if (!item.readAt) {
        const updated = (await db.query<NotificationRecord>(
          `UPDATE "Notification" SET "readAt" = NOW() WHERE "id" = $1 AND "employeeId" = $2
           RETURNING "id", "kind", "title", "body", "link", "readAt", "createdAt"`, [id, employeeId],
        )).rows[0];
        await this.audit.record(db, context, {
          action: 'notifications.read', entityType: 'Notification', entityId: id,
          summary: 'Read a notification',
          changes: { readAt: { from: null, to: updated.readAt } },
        });
        await db.query('COMMIT');
        return updated;
      }
      await db.query('COMMIT');
      return item;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally { db.release(); }
  }

  async markAllRead(employeeId: number, context: AuditContext) {
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const result = await db.query<{ id: number }>(
        `UPDATE "Notification" SET "readAt" = NOW()
         WHERE "employeeId" = $1 AND "readAt" IS NULL RETURNING "id"`, [employeeId],
      );
      if (result.rowCount) await this.audit.record(db, context, {
        action: 'notifications.read', entityType: 'Employee', entityId: employeeId,
        summary: `Read ${result.rowCount} notifications`,
        changes: { unreadNotifications: { from: result.rowCount, to: 0 } },
      });
      await db.query('COMMIT');
      return { updated: result.rowCount ?? 0 };
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally { db.release(); }
  }

  /** Called once a minute; SQL unique keys make selection and email claims safe across instances. */
  async runScheduledWork() {
    const setting = await this.pool.query<{ notificationDigestTime: string }>(
      `SELECT "notificationDigestTime" FROM "Setting" WHERE "id" = 1`,
    );
    const digestTime = setting.rows[0]?.notificationDigestTime;
    if (!digestTime || officeTime() < digestTime) return;
    const today = await this.officeDay();
    if (this.remindersCreatedOn !== today) {
      await this.createDailyReminders();
      this.remindersCreatedOn = today;
    }
    await this.sendDigests();
  }

  async createDailyReminders() {
    const today = await this.officeDay();
    const documents = await this.pool.query<Reminder>(DOCUMENT_REMINDERS_SQL);
    for (const row of documents.rows) {
      const kind = row.kind!;
      const label = `${row.type}${row.title ? ` (${row.title})` : ''}`;
      await this.insertReminder(row, kind,
        { label, detail: row.clientName, targetId: row.id }, `document:${row.id}:${kind}:${row.day}`);
    }
    const leads = await this.pool.query<Reminder>(LEAD_REMINDERS_SQL);
    for (const row of leads.rows) await this.insertReminder(row, 'lead_follow_up_due',
      { label: row.name!, targetId: row.id }, `lead:${row.id}:${today}`);
    const tasks = await this.pool.query<Reminder>(TASK_REMINDERS_SQL);
    for (const row of tasks.rows) await this.insertReminder(row, 'task_overdue',
      { label: row.title!, targetId: row.id }, `task:${row.id}:${today}`);
  }

  private async insertReminder(
    row: Reminder,
    kind: NotificationKind,
    values: { label: string; detail?: string; targetId: number },
    dedupeKey: string,
  ) {
    const copy = notificationCopy(kind, row.preferredLanguage, values);
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "Notification" ("employeeId", "kind", "title", "body", "link", "dedupeKey")
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT ("employeeId", "dedupeKey") DO NOTHING RETURNING "id"`,
        [row.employeeId, kind, copy.title, copy.body, copy.link, dedupeKey],
      );
      if (inserted.rows[0]) await this.audit.record(db, { actor: null }, {
        action: 'notifications.created', entityType: 'Notification', entityId: inserted.rows[0].id,
        summary: copy.title,
        changes: { kind, title: copy.title, body: copy.body, link: copy.link },
      });
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    } finally { db.release(); }
  }

  private async sendDigests() {
    if (!this.mailer.enabled) return;
    const people = await this.pool.query<{ employeeId: number; email: string; preferredLanguage: 'en' | 'ar' }>(
      `SELECT DISTINCT e."id" AS "employeeId", e."email", e."preferredLanguage"
       FROM "Notification" n JOIN "Employee" e ON e."id" = n."employeeId"
       WHERE e."status" = 'Active' AND e."emailNotificationsEnabled"
         AND n."createdAt" >= NOW() - INTERVAL '24 hours'
         AND NOT EXISTS (SELECT 1 FROM "NotificationDigest" d
           WHERE d."employeeId" = e."id" AND d."day" = (now() AT TIME ZONE 'Asia/Dubai')::date)`,
    );
    for (const person of people.rows) {
      const claim = await this.pool.query(
        `INSERT INTO "NotificationDigest" ("employeeId", "day")
         VALUES ($1, (now() AT TIME ZONE 'Asia/Dubai')::date) ON CONFLICT DO NOTHING RETURNING 1`,
        [person.employeeId],
      );
      if (!claim.rowCount) continue;
      try {
        const messages = await this.pool.query<{ title: string; body: string; link: string }>(
          `SELECT "title", "body", "link" FROM "Notification" WHERE "employeeId" = $1
           AND "createdAt" >= NOW() - INTERVAL '24 hours' ORDER BY "createdAt"`,
          [person.employeeId],
        );
        await this.mailer.sendDigest(person.email, person.preferredLanguage, messages.rows);
        await this.pool.query(
          `UPDATE "NotificationDigest" SET "sentAt" = NOW()
           WHERE "employeeId" = $1 AND "day" = (now() AT TIME ZONE 'Asia/Dubai')::date`,
          [person.employeeId],
        );
      } catch {
        // Keep the daily claim: SMTP delivery can succeed just before a connection drops.
        this.logger.warn('A notification digest could not be sent.');
      }
    }
  }

  private async officeDay() {
    const result = await this.pool.query<{ day: string }>(`SELECT (now() AT TIME ZONE 'Asia/Dubai')::date::text AS day`);
    return result.rows[0].day;
  }
}

function officeTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date());
}

type Cursor = { unread: boolean; createdAt: string; id: number };
function encodeCursor(item: NotificationRecord) {
  return Buffer.from(JSON.stringify({ unread: item.readAt === null, createdAt: item.createdAt, id: item.id })).toString('base64url');
}
function decodeCursor(cursor: string): Cursor {
  try {
    const value = JSON.parse(Buffer.from(cursor, 'base64url').toString()) as Cursor;
    if (typeof value.unread !== 'boolean' || typeof value.createdAt !== 'string' || !Number.isInteger(value.id)) throw new Error();
    return value;
  } catch {
    throw new BadRequestException(problem('notifications.invalid_cursor', 'Invalid notification cursor'));
  }
}
