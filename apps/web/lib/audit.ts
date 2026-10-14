import { api } from "@/lib/api";

// Office time, whatever time zone the viewer's computer is set to.
export const OFFICE_TIME_ZONE = "Asia/Dubai";

export type AuditLogEntry = {
  id: number;
  occurredAt: string;
  actorEmployeeId: number | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  changes: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
};

export type AuditLogPage = {
  items: AuditLogEntry[];
  nextBefore: number | null;
};

/** Actions the Activity filter offers; labels come from useI18n().action(). */
export const AUDIT_ACTIONS = [
  "employee.created",
  "employee.status_changed",
  "client.created",
  "auth.login",
  "auth.logout",
  "auth.login_failed",
  "auth.account_locked",
  "auth.password_changed",
  "task_type.created",
  "task_type.updated",
  "task_type.deleted",
  "task.created",
  "task.updated",
  "task.archived",
  "task.restored",
  "task.stage_started",
  "task.stage_completed",
  "task.stage_blocked",
  "task.stage_resumed",
  "task.stage_reassigned",
  "task.stage_reopened",
] as const;

export type AuditFilters = {
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  before?: number;
  limit?: number;
};

export function fetchAuditLogs(filters: AuditFilters, signal?: AbortSignal) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  return api<AuditLogPage>(`/audit-logs?${params}`, { signal });
}

/** "status: Active → Inactive" lines for updates; "name: X" for creations. */
export function describeChanges(changes: Record<string, unknown> | null): string[] {
  if (!changes) return [];
  return Object.entries(changes).map(([field, value]) => {
    if (value && typeof value === "object" && "from" in value && "to" in value) {
      const { from, to } = value as { from: unknown; to: unknown };
      return `${field}: ${String(from ?? "—")} → ${String(to ?? "—")}`;
    }
    return `${field}: ${Array.isArray(value) ? value.join(", ") : String(value ?? "—")}`;
  });
}
