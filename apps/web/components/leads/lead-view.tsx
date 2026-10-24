"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import EntityHistory from "@/components/audit/entity-history";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link, { useRouter } from "@/components/i18n/link";
import LeadFormDialog from "@/components/leads/lead-form-dialog";
import { inputClass, primaryButton } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import { formatAmount, FOLLOW_UP_KINDS, LEAD_STATUS_STYLES, type FollowUpKind, type LeadDetail } from "@/lib/leads";
import { todayInBrowserTimeZone } from "@/lib/people";
import { DetailHeader, Page } from "@/components/ui/page";
import { alertClass, buttonClass } from "@/components/ui/styles";

export default function LeadView({ leadId }: { leadId: number }) {
  const router = useRouter();
  const { can } = useCurrentUser();
  const { t, day, errorText } = useI18n();
  const l = t.leads;
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<LeadDetail>(`/leads/${leadId}`, { signal: controller.signal })
      .then(setLead)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiError && err.status === 404 ? l.notFound : errorText(err, l.unableToLoad));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [leadId]);

  function updated(next: LeadDetail) {
    setLead(next);
    setEditing(false);
    setActionError("");
    setHistoryKey((key) => key + 1);
  }

  async function convert(current: LeadDetail) {
    if (!window.confirm(l.confirmConvert(current.name))) return;
    setBusy(true);
    try {
      const result = await api<{ lead: LeadDetail }>(`/leads/${current.id}/convert`, { method: "POST" });
      updated(result.lead);
    } catch (err) {
      setActionError(errorText(err, l.unableToConvert));
    } finally {
      setBusy(false);
    }
  }

  async function remove(current: LeadDetail) {
    if (!window.confirm(l.confirmRemove(current.name))) return;
    try {
      await api<void>(`/leads/${current.id}`, { method: "DELETE" });
      router.push("/leads");
    } catch (err) {
      setActionError(errorText(err, l.unableToSave));
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <p role="alert" className={alertClass}>{error}</p>
        <Link href="/leads" className="mt-3 inline-block text-sm text-brand-700 hover:underline">{l.back}</Link>
      </div>
    );
  }
  if (!lead) return <p role="status" className="p-6 text-sm text-slate-500">{l.loadingOne}</p>;

  const none = <span className="text-slate-400">{t.common.none}</span>;
  const open = lead.status !== "Won" && lead.status !== "Lost";

  return (
    <Page className="space-y-6">
      <DetailHeader
        backHref="/leads"
        backLabel={l.back}
        meta={<span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${LEAD_STATUS_STYLES[lead.status]}`}>{l.statuses[lead.status]}</span>}
        title={lead.name}
        subtitle={lead.contactName}
        actions={<>
          {can("leads.edit") && !lead.client && lead.status !== "Lost" && can("clients.create") && (
            <button type="button" onClick={() => void convert(lead)} disabled={busy} className={buttonClass("primary", "sm")}>
              <UserPlus size={14} aria-hidden="true" /> {l.convert}
            </button>
          )}
          {can("leads.edit") && (
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}>
              <Pencil size={14} aria-hidden="true" /> {t.common.edit}
            </button>
          )}
          {can("leads.delete") && (
            <button type="button" onClick={() => void remove(lead)} className={buttonClass("secondary", "sm")}>
              <Trash2 size={14} aria-hidden="true" /> {l.remove}
            </button>
          )}
        </>}
      />

      {lead.client && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span dir="auto">{l.converted(lead.client.clientCode)}</span>
          <Link href={`/clients/${lead.client.id}`} className="font-medium underline">{l.openClient}</Link>
        </p>
      )}
      {actionError && <p role="alert" className={alertClass}>{actionError}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <dl className="space-y-3">
            <Fact label={l.email}>{lead.email ? <a href={`mailto:${lead.email}`} dir="ltr" className="text-brand-700 hover:underline">{lead.email}</a> : none}</Fact>
            <Fact label={l.phone}>{lead.phone ? <a href={`tel:${lead.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="text-brand-700 hover:underline">{lead.phone}</a> : none}</Fact>
            <Fact label={l.source}>{lead.source ? l.sources[lead.source] : none}</Fact>
            <Fact label={l.servicesLabel}>
              {lead.services.length ? (
                <span className="flex flex-wrap gap-1">
                  {lead.services.map((key) => <span key={key} className="rounded-full bg-brand-50 px-2 py-0.5 text-xs text-brand-800">{l.services[key]}</span>)}
                </span>
              ) : none}
            </Fact>
            <Fact label={l.value}><span dir="ltr">{lead.estimatedValue === null ? t.common.none : l.aed(formatAmount(lead.estimatedValue))}</span></Fact>
            <Fact label={l.owner}>{lead.owner?.name ?? <span className="text-slate-400">{l.noOwner}</span>}</Fact>
            <Fact label={l.nextFollowUp}>
              {lead.nextFollowUpDate ? <span className={lead.followUpDue ? "font-semibold text-red-700" : ""}>{day(lead.nextFollowUpDate)}</span> : none}
            </Fact>
            {lead.status === "Lost" && <Fact label={l.lostReason}>{lead.lostReason}</Fact>}
          </dl>
          {lead.notes && <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-700">{lead.notes}</p>}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">{l.followUps}</h2>
          {can("leads.edit") && open && <FollowUpForm lead={lead} onSaved={updated} />}
          {lead.followUps.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">{l.noFollowUps}</p>
          ) : (
            <ol className="mt-4 space-y-3 border-s-2 border-slate-100 ps-4">
              {lead.followUps.map((item) => (
                <li key={item.id}>
                  <p className="text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{l.kinds[item.kind]}</span> · {day(item.happenedOn)} · {item.createdBy.name}
                  </p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-800" dir="auto">{item.note}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {can("history.view") && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <EntityHistory key={historyKey} entityType="Lead" entityId={String(lead.id)} />
        </section>
      )}

      {editing && <LeadFormDialog lead={lead} onClose={() => setEditing(false)} onSaved={updated} />}
    </Page>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-slate-900">{children}</dd>
    </div>
  );
}

function FollowUpForm({ lead, onSaved }: { lead: LeadDetail; onSaved: (lead: LeadDetail) => void }) {
  const { t, errorText } = useI18n();
  const l = t.leads;
  const [kind, setKind] = useState<FollowUpKind>("Call");
  const [note, setNote] = useState("");
  const [happenedOn, setHappenedOn] = useState(todayInBrowserTimeZone());
  const [nextDate, setNextDate] = useState(lead.nextFollowUpDate ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const saved = await api<LeadDetail>(`/leads/${lead.id}/follow-ups`, {
        method: "POST",
        body: JSON.stringify({
          kind,
          note,
          happenedOn,
          // Unchanged means "keep the plan"; cleared means "nothing planned".
          ...(nextDate !== (lead.nextFollowUpDate ?? "") ? { nextFollowUpDate: nextDate || null } : {}),
        }),
      });
      setNote("");
      onSaved(saved);
    } catch (err) {
      setError(errorText(err, l.unableToSave));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="mt-3 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{l.logFollowUp}</p>
      {error && <p role="alert" className={alertClass}>{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="fu-kind" className="text-xs font-medium">{l.kind}</label>
          <select id="fu-kind" value={kind} onChange={(ev) => setKind(ev.target.value as FollowUpKind)} className={inputClass}>
            {FOLLOW_UP_KINDS.map((value) => <option key={value} value={value}>{l.kinds[value]}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="fu-date" className="text-xs font-medium">{l.happenedOn}</label>
          <input id="fu-date" type="date" required value={happenedOn} onChange={(ev) => setHappenedOn(ev.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="fu-next" className="text-xs font-medium">{l.nextDate}</label>
          <input id="fu-next" type="date" value={nextDate} onChange={(ev) => setNextDate(ev.target.value)} className={inputClass} />
        </div>
      </div>
      <div>
        <label htmlFor="fu-note" className="text-xs font-medium">{l.note}</label>
        <textarea id="fu-note" required rows={2} maxLength={2000} value={note} onChange={(ev) => setNote(ev.target.value)} className={inputClass} />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={saving || !note.trim()} className={primaryButton}>{l.save}</button>
      </div>
    </form>
  );
}
