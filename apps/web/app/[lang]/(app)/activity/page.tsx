"use client";

import { useEffect, useState } from "react";
import AuditTimeline from "@/components/audit/audit-timeline";
import { useI18n } from "@/components/i18n/i18n-provider";
import { Page, PageHeader } from "@/components/ui/page";
import {
  AUDIT_ACTIONS,
  fetchAuditLogs,
  type AuditFilters,
  type AuditLogEntry,
} from "@/lib/audit";
import { alertClass, labelClass } from "@/components/ui/styles";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500";

const PAGE_SIZE = 50;

export default function ActivityPage() {
  const { t, action: actionLabel, errorText } = useI18n();
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const filters: AuditFilters = { action, from, to, limit: PAGE_SIZE };

  // Reload from the newest entry whenever a filter changes.
  useEffect(() => {
    const controller = new AbortController();
    fetchAuditLogs({ action, from, to, limit: PAGE_SIZE }, controller.signal)
      .then((page) => {
        setEntries(page.items);
        setNextBefore(page.nextBefore);
        setError("");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(errorText(err, t.activity.unableToLoad));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [action, from, to]);

  async function loadOlder() {
    if (nextBefore === null) return;
    setLoadingMore(true);
    try {
      const page = await fetchAuditLogs({ ...filters, before: nextBefore });
      setEntries((current) => [...current, ...page.items]);
      setNextBefore(page.nextBefore);
    } catch (err) {
      setError(errorText(err, t.activity.unableToLoad));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <Page size="narrow" className="space-y-6">
      <PageHeader eyebrow={t.activity.eyebrow} title={t.activity.title} subtitle={t.activity.subtitle} />

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="activity-action" className={labelClass}>
              {t.activity.action}
            </label>
            <select
              id="activity-action"
              value={action}
              onChange={(event) => {
                setLoading(true);
                setAction(event.target.value);
              }}
              className={inputClass}
            >
              <option value="">{t.activity.allActions}</option>
              {AUDIT_ACTIONS.map((value) => (
                <option key={value} value={value}>
                  {actionLabel(value)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="activity-from" className={labelClass}>
              {t.common.from}
            </label>
            <input
              id="activity-from"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(event) => {
                setLoading(true);
                setFrom(event.target.value);
              }}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="activity-to" className={labelClass}>
              {t.common.to}
            </label>
            <input
              id="activity-to"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(event) => {
                setLoading(true);
                setTo(event.target.value);
              }}
              className={inputClass}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className={alertClass}>
            {error}
          </p>
        )}

        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            {t.activity.loading}
          </p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t.activity.none}
          </p>
        ) : (
          <>
            <AuditTimeline entries={entries} showIp />
            {nextBefore !== null && (
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => void loadOlder()}
                  disabled={loadingMore}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  {loadingMore ? t.common.loading : t.common.loadOlder}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </Page>
  );
}
