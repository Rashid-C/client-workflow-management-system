"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CircleDot, Clock, ListTodo } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import MyWorkList from "@/components/dashboard/my-work-list";
import { api } from "@/lib/api";
import type { Dashboard } from "@/lib/dashboard";
import { STATUS_STYLES, taskRef } from "@/lib/tasks";

export default function OverviewPage() {
  const { user, can } = useCurrentUser();
  const { t, minutes, day, dateTime, status, errorText } = useI18n();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<Dashboard>("/dashboard", { signal: controller.signal })
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(errorText(err, t.dashboard.unableToLoad));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  const firstName = user?.name.split(" ")[0];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {firstName ? t.dashboard.hello(firstName) : t.dashboard.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">{t.dashboard.subtitle}</p>
        </div>
        {can("tasks.create") && (
          <Link href="/tasks" className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">
            {t.dashboard.goToTasks}
          </Link>
        )}
      </header>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {!data && !error && <p role="status" className="py-8 text-center text-sm text-slate-500">{t.common.loading}</p>}

      {data && (
        <>
          <section aria-label={t.dashboard.myWork} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Tile icon={<CircleDot size={18} />} label={t.dashboard.inProgress} value={data.me.inProgress} />
            <Tile icon={<ListTodo size={18} />} label={t.dashboard.pending} value={data.me.pending} />
            <Tile icon={<AlertTriangle size={18} />} label={t.dashboard.blocked} value={data.me.blocked} danger={data.me.blocked > 0} />
            <Tile icon={<Clock size={18} />} label={t.dashboard.loggedThisWeek} value={minutes(data.me.minutesThisWeek)} />
          </section>

          <section aria-labelledby="my-work-title" className="rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 id="my-work-title" className="text-sm font-semibold">{t.dashboard.myWork}</h2>
              <Link href="/my-work" className="text-xs text-brand-700 hover:underline">{t.dashboard.seeAll}</Link>
            </div>
            <MyWorkList items={data.myWork.slice(0, 8)} />
          </section>

          {data.team && (
            <>
              <h2 className="pt-2 text-lg font-semibold">{t.dashboard.teamOverview}</h2>
              <section aria-label={t.dashboard.teamOverview} className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Tile href="/tasks?open=true" label={t.dashboard.openTasks} value={data.team.openTasks} />
                <Tile href="/tasks?status=In%20progress" label={t.dashboard.inProgress} value={data.team.inProgress} />
                <Tile href="/tasks?status=Blocked" label={t.dashboard.blocked} value={data.team.blocked} danger={data.team.blocked > 0} />
                <Tile href="/tasks?overdue=true" label={t.dashboard.overdue} value={data.team.overdue} danger={data.team.overdue > 0} />
                <Tile href="/tasks?unassigned=true&open=true" label={t.dashboard.unassignedStages} value={data.team.unassignedStages} />
              </section>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <section aria-labelledby="blocked-title" className="rounded-xl border border-slate-200 bg-white">
                  <h3 id="blocked-title" className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">
                    {t.dashboard.blockedTitle(data.team.blockedStages.length)}
                  </h3>
                  {data.team.blockedStages.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">{t.dashboard.nothingBlocked}</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {data.team.blockedStages.map((item) => (
                        <li key={`${item.task.id}-${item.stage.position}`}>
                          <Link href={`/tasks/${item.task.id}`} className="block px-4 py-3 hover:bg-slate-50">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium"><span className="text-slate-400" dir="ltr">{taskRef(item.task.id)}</span> {item.task.title}</p>
                              <span className="shrink-0 text-xs text-slate-500">{item.assignee?.name ?? t.common.unassigned}</span>
                            </div>
                            <p className="text-xs text-slate-500">{item.client.name} · {item.stage.name}</p>
                            {item.reason && (
                              <p className="mt-1.5 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                                &ldquo;{item.reason}&rdquo;
                                {item.blockedBy && item.blockedAt && (
                                  <span className="text-red-600"> — {item.blockedBy.name}, {dateTime(item.blockedAt)}</span>
                                )}
                              </p>
                            )}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>

                <section aria-labelledby="due-title" className="rounded-xl border border-slate-200 bg-white">
                  <h3 id="due-title" className="border-b border-slate-100 px-4 py-3 text-sm font-semibold">{t.dashboard.dueSoon}</h3>
                  {data.team.dueSoon.length === 0 ? (
                    <p className="px-4 py-6 text-center text-xs text-slate-500">{t.dashboard.nothingDue}</p>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {data.team.dueSoon.map((task) => (
                        <li key={task.id}>
                          <Link href={`/tasks/${task.id}`} className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50">
                            <div className="min-w-0">
                              <p className="text-sm font-medium"><span className="text-slate-400" dir="ltr">{taskRef(task.id)}</span> {task.title}</p>
                              <p className="text-xs text-slate-500">{task.client.name}</p>
                            </div>
                            <div className="shrink-0 text-end">
                              <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[task.status]}`}>{status(task.status)}</span>
                              <p className="mt-1 text-xs text-slate-500">{day(task.dueDate)}</p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <section aria-labelledby="workload-title" className="rounded-xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h3 id="workload-title" className="text-sm font-semibold">{t.dashboard.workload}</h3>
                  <span className="text-xs text-slate-500">{t.dashboard.workloadHint}</span>
                </div>
                <WorkloadList rows={data.team.workload} />
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  icon,
  href,
  danger = false,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  href?: string;
  danger?: boolean;
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-sm text-slate-500">
        {icon && <span className="text-slate-400" aria-hidden="true">{icon}</span>}
        {label}
      </div>
      <p className={`mt-2 text-2xl font-semibold tracking-tight ${danger ? "text-red-700" : ""}`}>{value}</p>
    </>
  );
  const className = "block rounded-xl border border-slate-200 bg-white p-4";
  return href ? (
    <Link href={href} className={`${className} transition hover:border-slate-300 hover:shadow-sm`}>{body}</Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function WorkloadList({ rows }: { rows: NonNullable<Dashboard["team"]>["workload"] }) {
  const { t, minutes } = useI18n();
  if (rows.length === 0) {
    return <p className="px-4 py-6 text-center text-xs text-slate-500">{t.dashboard.noStaff}</p>;
  }
  const maxStages = Math.max(1, ...rows.map((row) => row.openStages));
  return (
    <ul className="divide-y divide-slate-100">
      {rows.map((row) => (
        <li key={row.employee.id} className="px-4 py-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="min-w-0 truncate">
              <span className="font-medium">{row.employee.name}</span>{" "}
              <span className="text-xs text-slate-500">{row.employee.designation}</span>
            </p>
            <p className="shrink-0 text-xs text-slate-600">
              {t.dashboard.openCount(row.openStages)} · {minutes(row.minutesThisWeek)}
            </p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
            <div className="h-full rounded-full bg-brand-600" style={{ width: `${(row.openStages / maxStages) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
