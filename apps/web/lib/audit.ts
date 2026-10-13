import { api } from "@/lib/api";

// Office time, whatever time zone the viewer's computer is set to.
export const OFFICE_TIME_ZONE = "Asia/Dubai";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: OFFICE_TIME_ZONE,
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatOfficeTime(iso: string) {
  return dateTime.format(new Date(iso));
}

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

export const ACTION_LABELS: Record<string, string> = {
  "employee.created": "Employee added",
  "employee.status_changed": "Employee status changed",
  "client.created": "Client added",
  "auth.login": "Signed in",
  "auth.logout": "Signed out",
  "auth.login_failed": "Failed sign-in",
  "auth.account_locked": "Account locked",
  "auth.password_changed": "Password changed",
};

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
