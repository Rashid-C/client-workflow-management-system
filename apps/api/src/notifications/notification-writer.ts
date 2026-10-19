import { randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';
import { notificationCopy } from './notification-copy.js';

/**
 * Tell a person a stage was assigned to them, inside the caller's
 * transaction. Not audited: the assignment itself already is.
 */
export async function notifyStageAssignee(
  db: PoolClient,
  input: { employeeId: number; taskId: number; taskTitle: string; stageId: number; stageName: string; position: number },
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
  await db.query(
    `INSERT INTO "Notification" ("employeeId", "kind", "title", "body", "link", "dedupeKey")
     VALUES ($1, 'stage_assigned', $2, $3, $4, $5)
     ON CONFLICT ("employeeId", "dedupeKey") DO NOTHING`,
    [input.employeeId, copy.title, copy.body, copy.link, `stage-assigned:${input.stageId}:${randomUUID()}`],
  );
}
