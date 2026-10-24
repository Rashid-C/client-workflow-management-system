"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import {
  compactTrn,
  EMAIL_PATTERN,
  EMIRATES,
  EMPTY_CLIENT,
  ENTITY_TYPES,
  JURISDICTIONS,
  monthName,
  PHONE_PATTERN,
  TRN_PATTERN,
  type AccountManagerOption,
  type ClientDetail,
  type ClientValues,
} from "@/lib/clients";
import { intlLocale } from "@/lib/i18n/config";
import { alertClass, labelClass } from "@/components/ui/styles";

type Key = keyof ClientValues;
/** The form holds text for every field; it becomes typed values on save. */
type Form = Record<Key, string>;

/** Only the editable fields: the API refuses anything else (id, version, …). */
const toForm = (values: ClientValues): Form =>
  Object.fromEntries(
    (Object.keys(EMPTY_CLIENT) as Key[]).map((key) => [key, values[key] === null ? "" : String(values[key])]),
  ) as Form;

const NUMBER_FIELDS = new Set<Key>(["financialYearEndMonth", "accountManagerId"]);

function toValues(form: Form): ClientValues {
  const values = Object.fromEntries(
    Object.entries(form).map(([key, raw]) => {
      const text = raw.trim();
      if (!text) return [key, null];
      if (NUMBER_FIELDS.has(key as Key)) return [key, Number(text)];
      if (key === "vatTrn" || key === "corporateTaxTrn") return [key, compactTrn(text)];
      return [key, text];
    }),
  ) as ClientValues;
  if (values.jurisdiction !== "Free zone") values.freeZone = null;
  return values;
}

/** Create a client, or edit `client` when given. */
export default function ClientFormDialog({
  client,
  onClose,
  onSaved,
}: {
  client?: ClientDetail;
  onClose: () => void;
  onSaved: (client: ClientDetail) => void;
}) {
  const { t, locale, errorText } = useI18n();
  const f = t.clients.fields;
  const [form, setForm] = useState<Form>(() => toForm(client ?? EMPTY_CLIENT));
  const [managers, setManagers] = useState<AccountManagerOption[]>([]);
  const [problems, setProblems] = useState<Partial<Record<Key, string>>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<AccountManagerOption[]>("/clients/account-managers").then(setManagers).catch(() => {});
  }, []);

  const set = (key: Key) => (event: { target: { value: string } }) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [key]: value }));
    setProblems((current) => ({ ...current, [key]: undefined }));
  };

  function check(values: ClientValues): Partial<Record<Key, string>> {
    const found: Partial<Record<Key, string>> = {};
    if (!values.name) found.name = t.clients.nameRequired;
    for (const key of ["vatTrn", "corporateTaxTrn"] as const) {
      if (values[key] && !TRN_PATTERN.test(values[key])) found[key] = t.clients.trnInvalid;
    }
    for (const key of ["email", "contactEmail"] as const) {
      if (values[key] && !EMAIL_PATTERN.test(values[key])) found[key] = t.clients.emailInvalid;
    }
    for (const key of ["phone", "contactPhone"] as const) {
      if (values[key] && !PHONE_PATTERN.test(values[key])) found[key] = t.clients.phoneInvalid;
    }
    return found;
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const values = toValues(form);
    const found = check(values);
    setProblems(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setError("");
    try {
      const saved = client
        ? await api<ClientDetail>(`/clients/${client.id}`, {
            method: "PATCH",
            body: JSON.stringify({ ...values, version: client.version }),
          })
        : await api<ClientDetail>("/clients", { method: "POST", body: JSON.stringify(values) });
      onSaved(saved);
    } catch (err) {
      setError(errorText(err, t.clients.unableToSave));
      setSaving(false);
    }
  }

  /** A labelled input; `ltr` for codes, numbers, emails and phones. */
  const text = (key: Key, options: { ltr?: boolean; rtl?: boolean; placeholder?: string; type?: string } = {}) => (
    <input
      id={`client-${key}`}
      type={options.type ?? "text"}
      value={form[key]}
      onChange={set(key)}
      dir={options.ltr ? "ltr" : options.rtl ? "rtl" : undefined}
      placeholder={options.placeholder}
      aria-invalid={Boolean(problems[key])}
      aria-describedby={problems[key] ? `client-${key}-problem` : undefined}
      className={inputClass}
    />
  );

  const select = (key: Key, options: readonly { value: string; label: string }[]) => (
    <select id={`client-${key}`} value={form[key]} onChange={set(key)} className={inputClass}>
      <option value="">{t.clients.choose}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  );

  const field = (key: Key, label: string, control: ReactNode, options: { hint?: string; wide?: boolean } = {}) => (
    <div className={options.wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={`client-${key}`} className={labelClass}>{label}</label>
      {control}
      {problems[key] ? (
        <p id={`client-${key}-problem`} className="mt-1 text-xs text-red-700">{problems[key]}</p>
      ) : options.hint ? (
        <p className="mt-1 text-xs text-slate-500">{options.hint}</p>
      ) : null}
    </div>
  );

  const section = (title: string, children: ReactNode) => (
    <fieldset className="border-t border-slate-100 pt-4 first:border-t-0 first:pt-0">
      <legend className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</legend>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );

  // A manager who has since been deactivated still shows, so saving
  // without touching the field keeps them.
  const current = client?.accountManager;
  const managerOptions = [
    ...managers.map((m) => ({ value: String(m.id), label: `${m.name} · ${m.designation}` })),
    ...(current && !managers.some((m) => m.id === current.id) ? [{ value: String(current.id), label: current.name }] : []),
  ];

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: monthName(intlLocale(locale), i + 1),
  }));

  return (
    <Modal
      wide
      title={client ? t.clients.editClient : t.clients.newClient}
      subtitle={client ? `${client.name} · ${client.clientCode}` : t.clients.newClientHint}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>{t.common.cancel}</button>
          <button type="submit" form="client-form" disabled={saving} className={primaryButton}>
            {saving ? t.common.saving : t.common.save}
          </button>
        </>
      }
    >
      <form id="client-form" onSubmit={save} noValidate className="space-y-5">
        {error && <p role="alert" className={alertClass}>{error}</p>}

        {section(t.clients.sections.company, <>
          {field("name", `${f.name} *`, text("name"), { hint: f.nameHint, wide: true })}
          {field("companyName", f.companyName, text("companyName", { ltr: true }))}
          {field("legalNameAr", f.legalNameAr, text("legalNameAr", { rtl: true }))}
          {field("entityType", f.entityType, select("entityType", ENTITY_TYPES.map((value) => ({ value, label: t.clients.entityTypes[value] }))))}
          {field("emirate", f.emirate, select("emirate", EMIRATES.map((value) => ({ value, label: t.clients.emirates[value] }))))}
          {field("jurisdiction", f.jurisdiction, select("jurisdiction", JURISDICTIONS.map((value) => ({ value, label: t.clients.jurisdictions[value] }))))}
          {form.jurisdiction === "Free zone"
            ? field("freeZone", f.freeZone, text("freeZone", { placeholder: f.freeZonePlaceholder }))
            : <div className="hidden sm:block" />}
          {field("tradeLicenseNumber", f.tradeLicenseNumber, text("tradeLicenseNumber", { ltr: true }))}
          {field("licenseAuthority", f.licenseAuthority, text("licenseAuthority", { placeholder: f.licenseAuthorityPlaceholder }))}
          {field("businessActivity", f.businessActivity, text("businessActivity"), { wide: true })}
        </>)}

        {section(t.clients.sections.tax, <>
          {field("vatTrn", f.vatTrn, text("vatTrn", { ltr: true }), { hint: f.trnHint })}
          {field("corporateTaxTrn", f.corporateTaxTrn, text("corporateTaxTrn", { ltr: true }), { hint: f.trnHint })}
          {field("financialYearEndMonth", f.financialYearEnd, select("financialYearEndMonth", months))}
        </>)}

        {section(t.clients.sections.details, <>
          {field("email", f.email, text("email", { ltr: true, type: "email" }))}
          {field("phone", f.phone, text("phone", { ltr: true, type: "tel" }))}
          {field("address", f.address, text("address"), { wide: true })}
        </>)}

        {section(t.clients.sections.contact, <>
          {field("contactName", f.contactName, text("contactName"))}
          {field("contactDesignation", f.contactDesignation, text("contactDesignation"))}
          {field("contactEmail", f.contactEmail, text("contactEmail", { ltr: true, type: "email" }))}
          {field("contactPhone", f.contactPhone, text("contactPhone", { ltr: true, type: "tel" }))}
        </>)}

        {section(t.clients.sections.internal, <>
          {field("accountManagerId", f.accountManager, select("accountManagerId", managerOptions))}
          <div className="hidden sm:block" />
          {field("notes", f.notes, (
            <textarea id="client-notes" rows={3} maxLength={2000} value={form.notes} onChange={set("notes")} className={inputClass} />
          ), { wide: true })}
        </>)}
      </form>
    </Modal>
  );
}
