import {
  ACTION_LABELS,
  describeChanges,
  formatOfficeTime,
  type AuditLogEntry,
} from "@/lib/audit";

const FAILURE_ACTIONS = new Set(["auth.login_failed", "auth.account_locked"]);

/** Newest-first list of audit entries: what, who, when, and why. */
export default function AuditTimeline({
  entries,
  showIp = false,
}: {
  entries: AuditLogEntry[];
  showIp?: boolean;
}) {
  return (
    <ol className="divide-y divide-slate-200">
      {entries.map((entry) => {
        const changes = describeChanges(entry.changes);
        return (
          <li key={entry.id} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium text-slate-900">{entry.summary}</p>
              <time
                dateTime={entry.occurredAt}
                className="shrink-0 text-xs text-slate-500"
              >
                {formatOfficeTime(entry.occurredAt)}
              </time>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              <span
                className={
                  FAILURE_ACTIONS.has(entry.action)
                    ? "font-medium text-red-700"
                    : "font-medium text-slate-600"
                }
              >
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              {" · "}
              {entry.actorName ?? "No signed-in user"}
              {showIp && entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
            </p>

            {entry.reason && (
              <p className="mt-1 text-xs text-slate-700">Reason: {entry.reason}</p>
            )}

            {changes.length > 0 && (
              <details className="mt-1 text-xs text-slate-600">
                <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-800">
                  Details
                </summary>
                <ul className="mt-1 space-y-0.5 break-all pl-4">
                  {changes.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}
