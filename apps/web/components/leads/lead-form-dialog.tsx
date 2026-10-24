"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import {
  LEAD_SOURCES,
  LEAD_STATUSES,
  SERVICE_KEYS,
  type LeadDetail,
  type LeadStatus,
  type OwnerOption,
  type ServiceKey,
} from "@/lib/leads";
import { alertClass, labelClass } from "@/components/ui/styles";

/** Add a lead, or edit `lead` when given. */
export default function LeadFormDialog({
  lead,
  onClose,
  onSaved,
}: {
  lead?: LeadDetail;
  onClose: () => void;
  onSaved: (lead: LeadDetail) => void;
}) {
  const { user } = useCurrentUser();
  const { t, errorText } = useI18n();
  const l = t.leads;
  const [owners, setOwners] = useState<OwnerOption[]>([]);
  const [form, setForm] = useState({
    name: lead?.name ?? "",
    contactName: lead?.contactName ?? "",
    email: lead?.email ?? "",
    phone: lead?.phone ?? "",
    source: lead?.source ?? "",
    estimatedValue: lead?.estimatedValue === null || lead?.estimatedValue === undefined ? "" : String(lead.estimatedValue),
    status: (lead?.status ?? "New") as LeadStatus,
    ownerId: lead?.owner ? String(lead.owner.id) : user ? String(user.employeeId) : "",
    nextFollowUpDate: lead?.nextFollowUpDate ?? "",
    lostReason: lead?.lostReason ?? "",
    notes: lead?.notes ?? "",
  });
  const [services, setServices] = useState<ServiceKey[]>(lead?.services ?? []);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<OwnerOption[]>("/leads/owners").then(setOwners).catch(() => {});
  }, []);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    const body = {
      ...form,
      source: form.source || null,
      estimatedValue: form.estimatedValue === "" ? null : Number(form.estimatedValue),
      ownerId: form.ownerId ? Number(form.ownerId) : null,
      services,
      ...(lead ? { version: lead.version } : {}),
    };
    try {
      onSaved(
        await api<LeadDetail>(lead ? `/leads/${lead.id}` : "/leads", {
          method: lead ? "PATCH" : "POST",
          body: JSON.stringify(body),
        }),
      );
    } catch (err) {
      setError(errorText(err, l.unableToSave));
      setSaving(false);
    }
  }

  const field = (id: string, label: string, control: ReactNode, hint?: string, wide = false) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {control}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );

  // A converted lead stays won (the API refuses anything else).
  const statuses = lead?.client ? (["Won"] as const) : LEAD_STATUSES;

  return (
    <Modal
      wide
      title={lead ? l.editTitle : l.addTitle}
      subtitle={lead?.name}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>{t.common.cancel}</button>
          <button type="submit" form="lead-form" disabled={saving} className={primaryButton}>
            {saving ? t.common.saving : t.common.save}
          </button>
        </>
      }
    >
      <form id="lead-form" onSubmit={save} className="space-y-4">
        {error && <p role="alert" className={alertClass}>{error}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {field("lead-name", `${l.name} *`, <input id="lead-name" required maxLength={150} value={form.name} onChange={set("name")} className={inputClass} />, undefined, true)}
          {field("lead-contact", l.contactName, <input id="lead-contact" maxLength={150} value={form.contactName} onChange={set("contactName")} className={inputClass} />)}
          {field("lead-source", l.source, (
            <select id="lead-source" value={form.source} onChange={set("source")} className={inputClass}>
              <option value="">{t.clients.choose}</option>
              {LEAD_SOURCES.map((value) => <option key={value} value={value}>{l.sources[value]}</option>)}
            </select>
          ))}
          {field("lead-email", l.email, <input id="lead-email" type="email" dir="ltr" maxLength={254} value={form.email} onChange={set("email")} className={inputClass} />)}
          {field("lead-phone", l.phone, <input id="lead-phone" type="tel" dir="ltr" maxLength={30} value={form.phone} onChange={set("phone")} className={inputClass} />)}

          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-medium text-slate-800">{l.servicesLabel}</legend>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {SERVICE_KEYS.map((key) => {
                const on = services.includes(key);
                return (
                  <label key={key} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${on ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600"}`}>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={on}
                      onChange={(ev) => setServices((current) => (ev.target.checked ? [...current, key] : current.filter((s) => s !== key)))}
                    />
                    {l.services[key]}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {field("lead-status", l.status, (
            <select id="lead-status" value={form.status} onChange={set("status")} className={inputClass}>
              {statuses.map((value) => <option key={value} value={value}>{l.statuses[value]}</option>)}
            </select>
          ))}
          {field("lead-owner", l.owner, (
            <select id="lead-owner" value={form.ownerId} onChange={set("ownerId")} className={inputClass}>
              <option value="">{l.noOwner}</option>
              {owners.map((owner) => <option key={owner.id} value={owner.id}>{owner.name} · {owner.designation}</option>)}
            </select>
          ))}
          {field("lead-value", l.value, <input id="lead-value" type="number" min={0} step={1} dir="ltr" value={form.estimatedValue} onChange={set("estimatedValue")} className={inputClass} />, l.valueHint)}
          {field("lead-next", l.nextFollowUp, <input id="lead-next" type="date" value={form.nextFollowUpDate} onChange={set("nextFollowUpDate")} className={inputClass} />)}
          {form.status === "Lost" &&
            field("lead-lost", `${l.lostReason} *`, <input id="lead-lost" required maxLength={300} value={form.lostReason} onChange={set("lostReason")} className={inputClass} />, undefined, true)}
          {field("lead-notes", l.notes, <textarea id="lead-notes" rows={3} maxLength={2000} value={form.notes} onChange={set("notes")} className={inputClass} />, undefined, true)}
        </div>
      </form>
    </Modal>
  );
}
