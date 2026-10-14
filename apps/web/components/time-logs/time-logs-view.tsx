"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { inputClass } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { taskRef, type PersonRef } from "@/lib/tasks";

type TimeLogEntry = {
  id: number;
  workDate: string;
  minutes: number;
  note: string | null;
  employee: PersonRef;
  task: { id: number; title: string };
  client: { id: number; name: string };
  stage: { position: number; name: string };
};

type Page = {
  items: TimeLogEntry[];
  nextBefore: string | null;
  totalMinutes: number;
  byEmployee: (PersonRef & { minutes: number })[];
};

type Option = { id: number; name: string };

/** Time logs with filters; `defaultFrom` (this month) is worked out per request. */
export default function TimeLogsView({ defaultFrom }: { defaultFrom: string }) {
  const { user, can } = useCurrentUser();
  const { t, day, minutes, errorText } = useI18n();
  const seesEveryone = user?.permissions["time_logs.view"] === "all";

  const [employeeId, setEmployeeId] = useState("");
  const [clientId, setClientId] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState("");

  const [people, setPeople] = useState<Option[]>([]);
  const [clients, setClients] = useState<Option[]>([]);
  const [page, setPage] = useState<Page | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const canListPeople = seesEveryone && (can("employees.view") || can("tasks.assign"));
  const canListClients = can("clients.view");

  useEffect(() => {
    if (!canListPeople) return;
    const path = can("employees.view") ? "/employees" : "/tasks/assignable-employees";
    api<Option[]>(path).then(setPeople).catch(() => {});
  }, [canListPeople, can]);

  useEffect(() => {
    if (!canListClients) return;
    api<Option[]>("/clients").then(setClients).catch(() => {});
  }, [canListClients]);

  const query = (before?: string) => {
    const params = new URLSearchParams();
    if (employeeId) params.set("employeeId", employeeId);
    if (clientId) params.set("clientId", clientId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (before) params.set("before", before);
    return `/time-entries?${params}`;
  };

  useEffect(() => {
    const controller = new AbortController();
    api<Page>(query(), { signal: controller.signal })
      .then((data) => {
        setPage(data);
        setError("");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(errorText(err, t.timeLogs.unableToLoad));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query() reads these
  }, [employeeId, clientId, from, to]);

  async function loadOlder() {
    if (!page?.nextBefore) return;
    setLoadingMore(true);
    try {
      const older = await api<Page>(query(page.nextBefore));
      setPage((current) =>
        current ? { ...current, items: [...current.items, ...older.items], nextBefore: older.nextBefore } : older,
      );
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.timeLogs.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {seesEveryone ? t.timeLogs.subtitleTeam : t.timeLogs.subtitleOwn}
        </p>
      </header>

      <section className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        {canListPeople && (
          <div>
            <label htmlFor="log-staff" className="text-sm font-medium">{t.common.staff}</label>
            <select id="log-staff" value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={inputClass}>
              <option value="">{t.common.everyone}</option>
              {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        )}
        {canListClients && (
          <div>
            <label htmlFor="log-client" className="text-sm font-medium">{t.common.client}</label>
            <select id="log-client" value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}>
              <option value="">{t.common.allClients}</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}
        <div>
          <label htmlFor="log-from" className="text-sm font-medium">{t.common.from}</label>
          <input id="log-from" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} className={inputClass} />
        </div>
        <div>
          <label htmlFor="log-to" className="text-sm font-medium">{t.common.to}</label>
          <input id="log-to" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} className={inputClass} />
        </div>
      </section>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_16rem]">
        <section aria-labelledby="entries-title" className="rounded-xl border border-slate-200 bg-white">
          <h2 id="entries-title" className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">
            {t.timeLogs.entries}{page ? ` (${page.items.length}${page.nextBefore ? "+" : ""})` : ""}
          </h2>
          {!page ? (
            <p role="status" className="py-8 text-center text-sm text-slate-500">{t.timeLogs.loading}</p>
          ) : page.items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">{t.timeLogs.none}</p>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-start text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-2 font-medium">{t.common.date}</th>
                      <th className="px-4 py-2 font-medium">{t.common.staff}</th>
                      <th className="px-4 py-2 font-medium">{t.tasks.task}</th>
                      <th className="px-4 py-2 font-medium">{t.common.note}</th>
                      <th className="px-4 py-2 text-end font-medium">{t.common.time}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {page.items.map((entry) => (
                      <tr key={entry.id} className="align-top">
                        <td className="whitespace-nowrap px-4 py-3 text-xs">{day(entry.workDate)}</td>
                        <td className="px-4 py-3 text-xs">{entry.employee.name}</td>
                        <td className="px-4 py-3 text-xs">
                          <Link href={`/tasks/${entry.task.id}`} className="font-medium text-slate-900 hover:underline">
                            <span className="text-slate-400" dir="ltr">{taskRef(entry.task.id)}</span> {entry.task.title}
                          </Link>
                          <div className="text-slate-500">{entry.client.name} · {entry.stage.name}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">{entry.note ?? ""}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-end font-medium">{minutes(entry.minutes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-slate-100 md:hidden">
                {page.items.map((entry) => (
                  <li key={entry.id} className="px-4 py-3 text-xs">
                    <div className="flex items-start justify-between gap-3">
                      <Link href={`/tasks/${entry.task.id}`} className="font-medium text-slate-900">
                        <span className="text-slate-400" dir="ltr">{taskRef(entry.task.id)}</span> {entry.task.title}
                      </Link>
                      <span className="shrink-0 font-medium">{minutes(entry.minutes)}</span>
                    </div>
                    <p className="mt-0.5 text-slate-500">
                      {day(entry.workDate)} · {entry.employee.name} · {entry.stage.name}
                    </p>
                    {entry.note && <p className="mt-0.5 text-slate-600">{entry.note}</p>}
                  </li>
                ))}
              </ul>
              {page.nextBefore && (
                <div className="border-t border-slate-100 p-3 text-center">
                  <button type="button" disabled={loadingMore} onClick={() => void loadOlder()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50">
                    {loadingMore ? t.common.loading : t.common.loadOlder}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <aside aria-labelledby="total-title" className="h-fit rounded-xl border border-slate-200 bg-white p-4">
          <h2 id="total-title" className="text-sm font-semibold">{t.common.total}</h2>
          <p className="mt-2 text-3xl font-semibold tracking-tight">{page ? minutes(page.totalMinutes) : t.common.none}</p>
          {page && page.byEmployee.length > 0 && (
            <ul className="mt-3 space-y-1.5 text-sm">
              {page.byEmployee.map((row) => (
                <li key={row.id} className="flex justify-between gap-3">
                  <span className="truncate text-slate-600">{row.name}</span>
                  <span className="shrink-0 font-medium">{minutes(row.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
