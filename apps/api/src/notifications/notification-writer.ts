import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import type { AuditService, AuditContext } from '../audit/audit.service.js';
import { notificationCopy } from './notification-copy.js';

export async function notifyStageAssignee(
  db: PoolClient,
  input: { employeeId: number; taskId: number; taskTitle: string; stageId: number; stageName: string; position: number },
  audit: AuditService,
  context: AuditContext,
) {
  const employee = await db.query<{ preferredLanguage: 'en' | 'ar' }>(
    `SELECT "preferredLanguage" FROM "Employee" WHERE "id" = $1 AND "status" = 'Active'`,
    [input.employeeId],
  );
  const language = employee.rows[0]?.preferredLanguage;
  if (!language) return;
  const copy = notificationCopy('stage_assigned', language, {
    label: `${input.position}. ${input.stageName}`,
    detail: input.taskTitle,
    targetId: input.taskId,
  });
  const inserted = await db.query<{ id: number }>(
    `INSERT INTO "Notification" ("employeeId", "kind", "title", "body", "link", "dedupeKey")
     VALUES ($1, 'stage_assigned', $2, $3, $4, $5)
     ON CONFLICT ("employeeId", "dedupeKey") DO NOTHING RETURNING "id"`,
    [input.employeeId, copy.title, copy.body, copy.link, `stage-assigned:${input.stageId}:${randomUUID()}`],
  );
  if (inserted.rows[0]) await audit.record(db, context, {
    action: 'notifications.created', entityType: 'Notification', entityId: inserted.rows[0].id,
    summary: copy.title,
    changes: { kind: 'stage_assigned', title: copy.title, body: copy.body, link: copy.link },
  });
}
