"use client";

import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import { inputClass, primaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { labelClass } from "@/components/ui/styles";

type Person = { id: number; name: string; designation: string };

type DailyUpdate = {
  id: number;
  employee: Person;
  day: string;
  done: string;
  plan: string | null;
  blockers: string | null;
  loggedMinutes: number;
  version: number;
  createdAt: string;
  updatedAt: string;
};

type Today = {
  day: string;
  update: DailyUpdate | null;
  loggedMinutes: number;
  work: { taskId: number; title: string; clientName: string; stageName: string; minutes: number }[];
};

export default function DailyUpdatesView() {
  const { user, can } = useCurrentUser();
  const canPost = can("daily_updates.create");
  const seesTeam = user?.permissions["daily_updates.view"] === "all";
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
      {canPost && <MyUpdate />}
      <div className={`space-y-6 ${canPost ? "" : "lg:col-span-2"}`}>
        {seesTeam && <Missing />}
        <TeamFeed />
      </div>
    </div>
  );
}

function MyUpdate() {
  const { t, minutes, day, dateTime, errorText } = useI18n();
  const d = t.dailyUpdates;
  const [today, setToday] = useState<Today | null>(null);
  const [form, setForm] = useState({ done: "", plan: "", blockers: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<Today>("/daily-updates/today")
      .then((data) => {
        setToday(data);
        setForm({ done: data.update?.done ?? "", plan: data.update?.plan ?? "", blockers: data.update?.blockers ?? "" });
      })
      .catch((err: unknown) => setError(errorText(err, d.unableToLoad)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; t is stable per language
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!today) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const saved = await api<DailyUpdate>("/daily-updates/today", {
        method: "PUT",
        body: JSON.stringify({ ...form, ...(today.update ? { version: today.update.version } : {}) }),
      });
      setToday({ ...today, update: saved });
      setNotice(d.saved);
    } catch (err) {
      setError(errorText(err, d.unableToSave));
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  return (
    <section className="h-fit rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:sticky lg:top-6">
      <h2 className="font-semibold">{d.mine}</h2>
      {today && <p className="mt-0.5 text-sm text-slate-500">{day(today.day)}</p>}

      {today && (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          <p>{today.loggedMinutes ? d.loggedToday(minutes(today.loggedMinutes)) : d.nothingLogged}</p>
          {today.work.length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs text-slate-500">
              {today.work.map((item) => (
                <li key={`${item.taskId}-${item.stageName}`} className="flex justify-between gap-2">
                  <span className="truncate">{item.clientName} · {item.title} · {item.stageName}</span>
                  <span className="shrink-0">{minutes(item.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form onSubmit={save} className="mt-4 space-y-3">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{notice}</p>}
        <div>
          <label htmlFor="du-done" className={labelClass}>{d.done} *</label>
          <textarea id="du-done" required rows={5} maxLength={4000} value={form.done} onChange={set("done")} placeholder={d.donePlaceholder} className={inputClass} />
        </div>
        <div>
          <label htmlFor="du-plan" className={labelClass}>{d.plan}</label>
          <textarea id="du-plan" rows={3} maxLength={2000} value={form.plan} onChange={set("plan")} className={inputClass} />
        </div>
        <div>
          <label htmlFor="du-blockers" className={labelClass}>{d.blockers}</label>
          <textarea id="du-blockers" rows={2} maxLength={2000} value={form.blockers} onChange={set("blockers")} className={inputClass} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {today?.update ? d.postedAt(dateTime(today.update.updatedAt)) : d.pastLocked}
          </p>
          <button type="submit" disabled={saving || !today || !form.done.trim()} className={primaryButton}>
            {today?.update ? d.save : d.post}
          </button>
        </div>
      </form>
    </section>
  );
}

function Missing() {
  const { t } = useI18n();
  const d = t.dailyUpdates;
  const [people, setPeople] = useState<Person[] | null>(null);

  useEffect(() => {
    api<{ day: string; people: Person[] }>("/daily-updates/missing")
      .then((result) => setPeople(result.people))
      .catch(() => setPeople(null));
  }, []);

  if (!people) return null;
  return (
    <section className={`rounded-xl border p-4 ${people.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
      <p className={`text-sm font-medium ${people.length ? "text-amber-900" : "text-emerald-800"}`}>
        {people.length ? d.missing(people.length) : d.allPosted}
      </p>
      {people.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {people.map((person) => (
            <li key={person.id} className="rounded-full bg-white px-2.5 py-0.5 text-xs text-amber-900">{person.name}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function TeamFeed() {
  const { t, minutes, day, errorText } = useI18n();
  const d = t.dailyUpdates;
  const [items, setItems] = useState<DailyUpdate[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [filterDay, setFilterDay] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = (before?: number) => {
    const params = new URLSearchParams();
    if (filterDay) params.set("day", filterDay);
    if (person) params.set("employeeId", String(person.id));
    if (before) params.set("before", String(before));
    return `/daily-updates?${params}`;
  };

  useEffect(() => {
    const controller = new AbortController();
    api<{ items: DailyUpdate[]; nextBefore: number | null }>(query(), { signal: controller.signal })
      .then((page) => {
        setItems(page.items);
        setNextBefore(page.nextBefore);
        setError("");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(errorText(err, d.unableToLoad));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query() reads these
  }, [filterDay, person]);

  async function more() {
    if (!nextBefore) return;
    const page = await api<{ items: DailyUpdate[]; nextBefore: number | null }>(query(nextBefore));
    setItems((current) => [...current, ...page.items]);
    setNextBefore(page.nextBefore);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 className="font-semibold">{d.team}</h2>
        <div className="flex flex-wrap items-end gap-2">
          {person && (
            <button type="button" onClick={() => setPerson(null)} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs text-brand-800">
              {person.name} <X size={12} aria-label={d.allPeople} />
            </button>
          )}
          <div>
            <label htmlFor="du-day" className="text-xs font-medium">{d.day}</label>
            <input id="du-day" type="date" value={filterDay} onChange={(ev) => setFilterDay(ev.target.value)} className={`${inputClass} mt-1 py-1.5`} />
          </div>
        </div>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}
      {loading ? (
        <p role="status" className="mt-4 text-sm text-slate-500">{d.loading}</p>
      ) : items.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{d.none}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {items.map((item) => (
            <li key={item.id} className="py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <button type="button" onClick={() => setPerson(item.employee)} className="text-sm font-medium text-slate-900 hover:text-brand-700 hover:underline">
                  {item.employee.name}
                </button>
                <p className="text-xs text-slate-500">
                  {day(item.day)} · {d.logged(minutes(item.loggedMinutes))}
                  {item.version > 1 && ` · ${d.edited}`}
                </p>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800" dir="auto">{item.done}</p>
              {item.plan && (
                <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-600" dir="auto"><span className="font-medium">{d.plan}: </span>{item.plan}</p>
              )}
              {item.blockers && (
                <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-red-50 px-2 py-1 text-sm text-red-800" dir="auto"><span className="font-medium">{d.blockers} </span>{item.blockers}</p>
              )}
            </li>
          ))}
        </ul>
      )}
      {nextBefore && (
        <button type="button" onClick={() => void more()} className="mt-3 text-sm font-medium text-brand-700 hover:underline">{d.loadMore}</button>
      )}
    </section>
  );
}
