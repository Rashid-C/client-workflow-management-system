"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link, { useRouter } from "@/components/i18n/link";
import NewTaskDialog from "@/components/tasks/new-task-dialog";
import { inputClass } from "@/components/ui/modal";
import { cardClass } from "@/components/ui/card";
import { Page, PageHeader } from "@/components/ui/page";
import { alertClass, emptyClass, labelClass, primaryButton, secondaryButton } from "@/components/ui/styles";
import { api } from "@/lib/api";
import {
  isOverdue,
  STATUS_STYLES,
  taskRef,
  WORK_STATUSES,
  type Assignable,
  type TaskListItem,
} from "@/lib/tasks";

type TaskPage = { items: TaskListItem[]; nextBefore: number | null };

/** The task list; its starting filters come from the URL (dashboard links). */
export default function TasksList() {
  const router = useRouter();
  const initial = useSearchParams();
  const { can } = useCurrentUser();
  const { t, day, errorText } = useI18n();

  const [search, setSearch] = useState(initial.get("search") ?? "");
  const [status, setStatus] = useState(initial.get("status") ?? "");
  const [assigneeId, setAssigneeId] = useState(initial.get("assigneeId") ?? "");
  const [overdue, setOverdue] = useState(initial.get("overdue") === "true");
  const [open, setOpen] = useState(initial.get("open") === "true");
  const [unassigned, setUnassigned] = useState(initial.get("unassigned") === "true");
  const [people, setPeople] = useState<Assignable[]>([]);

  const [tasks, setTasks] = useState<TaskListItem[]>([]);
  const [nextBefore, setNextBefore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showNew, setShowNew] = useState(false);

  const query = (before?: number) => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (status) params.set("status", status);
    if (assigneeId) params.set("assigneeId", assigneeId);
    if (overdue) params.set("overdue", "true");
    if (open) params.set("open", "true");
    if (unassigned) params.set("unassigned", "true");
    if (before) params.set("before", String(before));
    return `/tasks?${params}`;
  };

  // Debounced reload on any filter change.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api<TaskPage>(query(), { signal: controller.signal })
        .then((page) => {
          setTasks(page.items);
          setNextBefore(page.nextBefore);
          setError("");
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(errorText(err, t.tasks.unableToLoad));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- query() reads these
  }, [search, status, assigneeId, overdue, open, unassigned]);

  const canFilterPeople = can("tasks.assign");
  useEffect(() => {
    if (!canFilterPeople) return;
    api<Assignable[]>("/tasks/assignable-employees").then(setPeople).catch(() => {});
  }, [canFilterPeople]);

  async function loadOlder() {
    if (nextBefore === null) return;
    const page = await api<TaskPage>(query(nextBefore));
    setTasks((current) => [...current, ...page.items]);
    setNextBefore(page.nextBefore);
  }

  const filterChanged = (apply: () => void) => {
    setLoading(true);
    apply();
  };

  return (
    <Page className="space-y-6">
      <PageHeader
        eyebrow={t.nav.groups.operations}
        title={t.tasks.title}
        subtitle={t.tasks.subtitle}
        actions={can("tasks.create") && (
          <button type="button" onClick={() => setShowNew(true)} className={primaryButton}>
            <Plus size={16} aria-hidden="true" />
            {t.tasks.newTask}
          </button>
        )}
      />

      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="task-search" className={labelClass}>{t.common.search}</label>
            <input
              id="task-search"
              value={search}
              onChange={(event) => filterChanged(() => setSearch(event.target.value))}
              placeholder={t.tasks.searchPlaceholder}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="task-status" className={labelClass}>{t.common.status}</label>
            <select id="task-status" value={status} onChange={(event) => filterChanged(() => setStatus(event.target.value))} className={inputClass}>
              <option value="">{t.tasks.allStatuses}</option>
              {WORK_STATUSES.map((s) => <option key={s} value={s}>{t.status[s]}</option>)}
            </select>
          </div>
          {canFilterPeople ? (
            <div>
              <label htmlFor="task-assignee" className={labelClass}>{t.tasks.assignee}</label>
              <select id="task-assignee" value={assigneeId} onChange={(event) => filterChanged(() => setAssigneeId(event.target.value))} className={inputClass}>
                <option value="">{t.common.anyone}</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ) : <div />}
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={open} onChange={(event) => filterChanged(() => setOpen(event.target.checked))} />
            {t.tasks.openOnly}
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={overdue} onChange={(event) => filterChanged(() => setOverdue(event.target.checked))} />
            {t.tasks.overdueOnly}
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={unassigned} onChange={(event) => filterChanged(() => setUnassigned(event.target.checked))} />
            {t.tasks.hasUnassigned}
          </label>
        </div>

        {error && <p role="alert" className={alertClass}>{error}</p>}

        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">{t.tasks.loading}</p>
        ) : tasks.length === 0 ? (
          <div className={emptyClass}>
            <p className="font-medium">{t.tasks.noneFound}</p>
            <p className="mt-1 text-sm text-slate-500">{t.tasks.noneFoundHint}</p>
          </div>
        ) : (
          <>
            <div className={`hidden overflow-x-auto md:block ${cardClass}`}>
              <table className="w-full min-w-212.5 text-start text-sm">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-medium">{t.tasks.task}</th>
                    <th className="px-3 py-3 font-medium">{t.tasks.currentStage}</th>
                    <th className="px-3 py-3 font-medium">{t.tasks.progress}</th>
                    <th className="px-3 py-3 font-medium">{t.tasks.due}</th>
                    <th className="px-3 py-3 font-medium">{t.common.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tasks.map((task) => (
                    <tr
                      key={task.id}
                      onClick={() => router.push(`/tasks/${task.id}`)}
                      className="cursor-pointer hover:bg-slate-50"
                    >
                      <td className="px-3 py-3">
                        <Link href={`/tasks/${task.id}`} className="font-medium hover:underline" onClick={(event) => event.stopPropagation()}>
                          <span className="text-slate-500" dir="ltr">{taskRef(task.id)}</span> {task.title}
                        </Link>
                        <div className="text-xs text-slate-500">{task.client.name} · {task.taskType.name}</div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {task.currentStage ? (
                          <>
                            <div>{task.currentStage.position}. {task.currentStage.name}</div>
                            <div className="text-slate-500">{task.currentStage.assignee?.name ?? t.common.unassigned}</div>
                          </>
                        ) : <span className="text-slate-500">{t.tasks.allStagesDone}</span>}
                      </td>
                      <td className="px-3 py-3"><Progress task={task} /></td>
                      <td className={`px-3 py-3 text-xs ${isOverdue(task) ? "font-semibold text-red-700" : "text-slate-600"}`}>
                        {task.dueDate ? day(task.dueDate) : t.common.none}
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={task.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="space-y-3 md:hidden">
              {tasks.map((task) => (
                <li key={task.id}>
                  <Link href={`/tasks/${task.id}`} className={`block p-4 ${cardClass}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium"><span className="text-slate-500" dir="ltr">{taskRef(task.id)}</span> {task.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{task.client.name} · {task.taskType.name}</p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <Progress task={task} />
                      {task.dueDate && (
                        <span className={isOverdue(task) ? "font-semibold text-red-700" : "text-slate-600"}>
                          {t.tasks.dueOn(day(task.dueDate))}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {nextBefore !== null && (
              <div className="text-center">
                <button type="button" onClick={() => void loadOlder()} className={secondaryButton}>
                  {t.common.loadMore}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {showNew && (
        <NewTaskDialog
          onClose={() => setShowNew(false)}
          onCreated={(task) => router.push(`/tasks/${task.id}`)}
        />
      )}
    </Page>
  );
}

function StatusBadge({ status }: { status: TaskListItem["status"] }) {
  const { status: statusLabel } = useI18n();
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {statusLabel(status)}
    </span>
  );
}

function Progress({ task }: { task: TaskListItem }) {
  const percent = task.stagesTotal ? Math.round((task.stagesCompleted / task.stagesTotal) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-slate-500" dir="ltr">{task.stagesCompleted}/{task.stagesTotal}</span>
    </div>
  );
}
