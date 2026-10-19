"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import { inputClass, primaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";

export type Settings = {
  companyName: string;
  companyNameAr: string | null;
  companyTrn: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  workingDays: number[];
  workdayStart: string;
  workdayEnd: string;
  documentReminderDays: number;
  notificationDigestTime: string;
  version: number;
  updatedAt: string;
};

const WEEK = [1, 2, 3, 4, 5, 6, 7] as const;

export default function SettingsForm() {
  const { can } = useCurrentUser();
  const { t, errorText } = useI18n();
  const s = t.settings;
  const editable = can("settings.manage");
  const [saved, setSaved] = useState<Settings | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [days, setDays] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  function load(settings: Settings) {
    setSaved(settings);
    setDays(settings.workingDays);
    setForm({
      companyName: settings.companyName,
      companyNameAr: settings.companyNameAr ?? "",
      companyTrn: settings.companyTrn ?? "",
      email: settings.email ?? "",
      phone: settings.phone ?? "",
      address: settings.address ?? "",
      workdayStart: settings.workdayStart,
      workdayEnd: settings.workdayEnd,
      documentReminderDays: String(settings.documentReminderDays),
      notificationDigestTime: settings.notificationDigestTime,
    });
  }

  useEffect(() => {
    api<Settings>("/settings")
      .then(load)
      .catch((err: unknown) => setError(errorText(err, s.unableToLoad)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; t is stable per language
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!saved) return;
    if (!days.length) return setError(s.needDay);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const next = await api<Settings>("/settings", {
        method: "PATCH",
        body: JSON.stringify({
          ...form,
          workingDays: days,
          documentReminderDays: Number(form.documentReminderDays || 0),
          version: saved.version,
        }),
      });
      load(next);
      setNotice(s.saved);
    } catch (err) {
      setError(errorText(err, s.unableToSave));
    } finally {
      setSaving(false);
    }
  }

  if (!saved) {
    return error ? <p role="alert" className="text-sm text-red-700">{error}</p> : <p role="status" className="text-sm text-slate-500">{s.loading}</p>;
  }

  const set = (key: string) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));
  const input = (key: string, label: string, options: { type?: string; ltr?: boolean; rtl?: boolean; hint?: string; wide?: boolean } = {}) => (
    <div className={options.wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={`set-${key}`} className="text-sm font-medium text-slate-800">{label}</label>
      <input
        id={`set-${key}`}
        type={options.type ?? "text"}
        value={form[key] ?? ""}
        onChange={set(key)}
        disabled={!editable}
        dir={options.ltr ? "ltr" : options.rtl ? "rtl" : undefined}
        className={inputClass}
      />
      {options.hint && <p className="mt-1 text-xs text-slate-500">{options.hint}</p>}
    </div>
  );

  return (
    <form onSubmit={save} className="space-y-6">
      {!editable && <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{s.viewOnly}</p>}
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}

      <Section title={s.company} hint={s.companyHint}>
        {input("companyName", `${s.companyName} *`, { wide: true })}
        {input("companyNameAr", s.companyNameAr, { rtl: true, wide: true })}
        {input("companyTrn", s.companyTrn, { ltr: true, hint: s.trnHint })}
        {input("email", s.email, { type: "email", ltr: true })}
        {input("phone", s.phone, { type: "tel", ltr: true })}
        {input("address", s.address, { wide: true })}
      </Section>

      <Section title={s.work} hint={s.workHint}>
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-medium text-slate-800">{s.workingDays}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEK.map((day) => {
              const on = days.includes(day);
              return (
                <label key={day} className={`rounded-full border px-3 py-1.5 text-sm ${editable ? "cursor-pointer" : ""} ${on ? "border-brand-500 bg-brand-50 text-brand-800" : "border-slate-200 text-slate-600"}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={on}
                    disabled={!editable}
                    onChange={(ev) => setDays((current) => (ev.target.checked ? [...current, day] : current.filter((d) => d !== day)))}
                  />
                  {s.days[day]}
                </label>
              );
            })}
          </div>
        </fieldset>
        {input("workdayStart", s.workdayStart, { type: "time", ltr: true })}
        {input("workdayEnd", s.workdayEnd, { type: "time", ltr: true })}
      </Section>

      <Section title={s.documents} hint={s.documentsHint}>
        <div>
          <label htmlFor="set-documentReminderDays" className="text-sm font-medium text-slate-800">{s.reminderDays}</label>
          <input
            id="set-documentReminderDays"
            type="number"
            min={0}
            max={365}
            value={form.documentReminderDays ?? ""}
            onChange={set("documentReminderDays")}
            disabled={!editable}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-slate-500">{s.reminderHint}</p>
        </div>
      </Section>

      <Section title={s.emailDigest} hint={s.emailDigestHint}>
        {input("notificationDigestTime", s.notificationDigestTime, { type: "time", ltr: true, wide: true })}
      </Section>

      {editable && (
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? t.common.saving : s.save}</button>
        </div>
      )}
    </form>
  );
}

function Section({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-0.5 text-sm text-slate-500">{hint}</p>
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
