"use client";

import { useI18n } from "@/components/i18n/i18n-provider";
import { describeChanges, type AuditLogEntry } from "@/lib/audit";

const FAILURE_ACTIONS = new Set(["auth.login_failed", "auth.account_locked"]);

/**
 * Newest-first list of audit entries: what, who, when, and why. The summary
 * is the sentence recorded at the time (English); the action name is shown
 * in the reader's language.
 */
export default function AuditTimeline({
  entries,
  showIp = false,
}: {
  entries: AuditLogEntry[];
  showIp?: boolean;
}) {
  const { t, dateTime, action } = useI18n();

  return (
    <ol className="divide-y divide-slate-200">
      {entries.map((entry) => {
        const changes = describeChanges(entry.changes);
        return (
          <li key={entry.id} className="py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <p className="text-sm font-medium text-slate-900" dir="auto">{entry.summary}</p>
              <time dateTime={entry.occurredAt} className="shrink-0 text-xs text-slate-500">
                {dateTime(entry.occurredAt)}
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
                {action(entry.action)}
              </span>
              {" · "}
              {entry.actorName ?? t.activity.noActor}
              {showIp && entry.ipAddress ? <span dir="ltr">{` · ${entry.ipAddress}`}</span> : null}
            </p>

            {entry.reason && (
              <p className="mt-1 text-xs text-slate-700" dir="auto">
                {t.activity.reason(entry.reason)}
              </p>
            )}

            {changes.length > 0 && (
              <details className="mt-1 text-xs text-slate-600">
                <summary className="cursor-pointer select-none text-slate-500 hover:text-slate-800">
                  {t.common.details}
                </summary>
                <ul className="mt-1 space-y-0.5 break-all ps-4" dir="ltr">
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
