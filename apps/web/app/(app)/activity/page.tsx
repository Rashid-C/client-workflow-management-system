"use client";

import { useEffect, useState } from "react";
import AuditTimeline from "@/components/audit/audit-timeline";
import {
  ACTION_LABELS,
  fetchAuditLogs,
  type AuditFilters,
  type AuditLogEntry,
} from "@/lib/audit";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500";

const PAGE_SIZE = 50;

export default function ActivityPage() {
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
        setError(err instanceof Error ? err.message : "Unable to load activity.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [action, from, to]);

  async function loadOlder() {
    if (nextBefore === null) return;
    setLoadingMore(true);
    try {
      const page = await fetchAuditLogs({ ...filters, before: nextBefore });
      setEntries((current) => [...current, ...page.items]);
      setNextBefore(page.nextBefore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load activity.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <header>
        <p className="text-sm text-slate-500">Audit trail</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Activity</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every recorded change, with who made it and when. Entries can never be
          edited or deleted. Times are Abu Dhabi time.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor="activity-action" className="text-sm font-medium">
              Action
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
              <option value="">All actions</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="activity-from" className="text-sm font-medium">
              From
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
            <label htmlFor="activity-to" className="text-sm font-medium">
              To
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
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            Loading activity...
          </p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No activity matches these filters.
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
                  {loadingMore ? "Loading..." : "Load older entries"}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
