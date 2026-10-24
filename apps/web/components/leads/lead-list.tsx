"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link, { useRouter } from "@/components/i18n/link";
import LeadFormDialog from "@/components/leads/lead-form-dialog";
import { inputClass, primaryButton } from "@/components/ui/modal";
import StatCard from "@/components/ui/stat-card";
import { api } from "@/lib/api";
import { formatAmount, LEAD_STATUSES, LEAD_STATUS_STYLES, type Lead, type LeadSummary } from "@/lib/leads";

export default function LeadList() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const { t, day, errorText } = useI18n();
  const l = t.leads;
  const [leads, setLeads] = useState<Lead[]>([]);
  const [summary, setSummary] = useState<LeadSummary | null>(null);
  const [status, setStatus] = useState("");
  const [due, setDue] = useState(false);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (due) params.set("due", "true");
    if (search.trim()) params.set("search", search.trim());
    const timer = window.setTimeout(() => {
      Promise.all([
        api<Lead[]>(`/leads?${params}`, { signal: controller.signal }),
        api<LeadSummary>("/leads/summary", { signal: controller.signal }),
      ])
        .then(([list, counts]) => {
          setLeads(list);
          setSummary(counts);
          setError("");
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(errorText(err, l.unableToLoad));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [status, due, search]);

  return (
    <div className="space-y-5">
      {summary && (
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {LEAD_STATUSES.map((value) => (
            <StatCard
              key={value}
              compact
              label={l.statuses[value]}
              value={summary.byStatus[value]}
              onClick={() => setStatus((current) => (current === value ? "" : value))}
              active={status === value}
            />
          ))}
          <StatCard
            compact
            label={l.followUpsDue}
            value={summary.followUpsDue}
            tone={summary.followUpsDue ? "danger" : "neutral"}
            onClick={() => setDue((current) => !current)}
            active={due}
          />
          <StatCard compact label={l.openValue} value={<span dir="ltr">{l.aed(formatAmount(summary.openValue))}</span>} tone="brand" />
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="lead-search" className="text-sm font-medium">{t.common.search}</label>
          <input id="lead-search" type="search" value={search} onChange={(ev) => setSearch(ev.target.value)} placeholder={l.searchPlaceholder} className={inputClass} />
        </div>
        {can("leads.create") && (
          <button type="button" onClick={() => setCreating(true)} className={`${primaryButton} inline-flex items-center justify-center gap-1.5`}>
            <Plus size={16} aria-hidden="true" /> {l.add}
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {loading ? (
        <p role="status" className="py-6 text-sm text-slate-500">{l.loading}</p>
      ) : leads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-500">{l.none}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 text-start font-medium">{l.lead}</th>
                <th className="px-3 py-2.5 text-start font-medium">{l.status}</th>
                <th className="px-3 py-2.5 text-start font-medium">{l.owner}</th>
                <th className="px-3 py-2.5 text-start font-medium">{l.nextFollowUp}</th>
                <th className="px-3 py-2.5 text-start font-medium">{l.value}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <Link href={`/leads/${lead.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">{lead.name}</Link>
                    {lead.contactName && <p className="text-xs text-slate-500">{lead.contactName}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_STYLES[lead.status]}`}>{l.statuses[lead.status]}</span>
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{lead.owner?.name ?? <span className="text-slate-400">{l.noOwner}</span>}</td>
                  <td className="px-3 py-2.5">
                    {lead.nextFollowUpDate ? (
                      <span className={lead.followUpDue ? "font-semibold text-red-700" : "text-slate-700"}>
                        {day(lead.nextFollowUpDate)}{lead.followUpDue && ` · ${l.due}`}
                      </span>
                    ) : t.common.none}
                  </td>
                  <td className="px-3 py-2.5 text-slate-700" dir="ltr">{lead.estimatedValue === null ? t.common.none : l.aed(formatAmount(lead.estimatedValue))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <LeadFormDialog onClose={() => setCreating(false)} onSaved={(lead) => router.push(`/leads/${lead.id}`)} />
      )}
    </div>
  );
}
