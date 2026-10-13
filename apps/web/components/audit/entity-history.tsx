"use client";

import { useEffect, useState } from "react";
import AuditTimeline from "@/components/audit/audit-timeline";
import { fetchAuditLogs, type AuditLogEntry } from "@/lib/audit";

const PAGE_SIZE = 10;

/** The audit trail of one record, e.g. an employee or a client. */
export default function EntityHistory({
  entityType,
  entityId,
}: {
  entityType: string;
  entityId: string;
}) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetchAuditLogs({ entityType, entityId, limit: PAGE_SIZE }, controller.signal)
      .then((page) => {
        setEntries(page.items);
        setNextBefore(page.nextBefore);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load history.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [entityType, entityId]);

  async function loadOlder() {
    if (nextBefore === null) return;
    try {
      const page = await fetchAuditLogs({
        entityType,
        entityId,
        limit: PAGE_SIZE,
        before: nextBefore,
      });
      setEntries((current) => [...current, ...page.items]);
      setNextBefore(page.nextBefore);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load history.");
    }
  }

  return (
    <section aria-labelledby="entity-history-title" className="mt-5">
      <h3 id="entity-history-title" className="text-sm font-semibold">
        History
      </h3>
      {loading ? (
        <p className="py-3 text-xs text-slate-500">Loading history...</p>
      ) : error ? (
        <p role="alert" className="py-3 text-xs text-red-700">
          {error}
        </p>
      ) : entries.length === 0 ? (
        <p className="py-3 text-xs text-slate-500">No recorded activity yet.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto pr-1">
          <AuditTimeline entries={entries} />
          {nextBefore !== null && (
            <button
              type="button"
              onClick={() => void loadOlder()}
              className="mt-1 text-xs font-medium text-blue-700 hover:underline"
            >
              Show older
            </button>
          )}
        </div>
      )}
    </section>
  );
}
