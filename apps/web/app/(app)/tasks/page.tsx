"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import NewTaskDialog from "@/components/tasks/new-task-dialog";
import { inputClass } from "@/components/ui/modal";
import { api } from "@/lib/api";
import {
  formatDay,
  isOverdue,
  STATUS_STYLES,
  taskRef,
  WORK_STATUSES,
  type Assignable,
  type TaskListItem,
} from "@/lib/tasks";

type Page = { items: TaskListItem[]; nextBefore: number | null };

export default function TasksPage() {
  const router = useRouter();
  const { can } = useCurrentUser();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [overdue, setOverdue] = useState(false);
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
    if (before) params.set("before", String(before));
    return `/tasks?${params}`;
  };

  // Debounced reload on any filter change.
  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api<Page>(query(), { signal: controller.signal })
        .then((page) => {
          setTasks(page.items);
          setNextBefore(page.nextBefore);
          setError("");
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(err instanceof Error ? err.message : "Unable to load tasks.");
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
  }, [search, status, assigneeId, overdue]);

  const canFilterPeople = can("tasks.assign");
  useEffect(() => {
    if (!canFilterPeople) return;
    api<Assignable[]>("/tasks/assignable-employees").then(setPeople).catch(() => {});
  }, [canFilterPeople]);

  async function loadOlder() {
    if (nextBefore === null) return;
    const page = await api<Page>(query(nextBefore));
    setTasks((current) => [...current, ...page.items]);
    setNextBefore(page.nextBefore);
  }

  const filterChanged = (apply: () => void) => {
    setLoading(true);
    apply();
  };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-slate-500">Client engagements, tracked stage by stage.</p>
        </div>
        {can("tasks.create") && (
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} aria-hidden="true" />
            New task
          </button>
        )}
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="md:col-span-2">
            <label htmlFor="task-search" className="text-sm font-medium">Search</label>
            <input
              id="task-search"
              value={search}
              onChange={(event) => filterChanged(() => setSearch(event.target.value))}
              placeholder="Title or number, e.g. #0004"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="task-status" className="text-sm font-medium">Status</label>
            <select id="task-status" value={status} onChange={(event) => filterChanged(() => setStatus(event.target.value))} className={inputClass}>
              <option value="">All statuses</option>
              {WORK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {canFilterPeople ? (
            <div>
              <label htmlFor="task-assignee" className="text-sm font-medium">Assignee</label>
              <select id="task-assignee" value={assigneeId} onChange={(event) => filterChanged(() => setAssigneeId(event.target.value))} className={inputClass}>
                <option value="">Anyone</option>
                {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          ) : <div />}
        </div>
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={overdue} onChange={(event) => filterChanged(() => setOverdue(event.target.checked))} />
          Overdue only
        </label>

        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

        {loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">Loading tasks...</p>
        ) : tasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center">
            <p className="font-medium">No tasks found</p>
            <p className="mt-1 text-sm text-slate-500">Try other filters, or create a task.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-212.5 text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-medium">Task</th>
                    <th className="px-3 py-3 font-medium">Current stage</th>
                    <th className="px-3 py-3 font-medium">Progress</th>
                    <th className="px-3 py-3 font-medium">Due</th>
                    <th className="px-3 py-3 font-medium">Status</th>
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
                          <span className="text-slate-400">{taskRef(task.id)}</span> {task.title}
                        </Link>
                        <div className="text-xs text-slate-500">{task.client.name} · {task.taskType.name}</div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        {task.currentStage ? (
                          <>
                            <div>{task.currentStage.position}. {task.currentStage.name}</div>
                            <div className="text-slate-500">{task.currentStage.assignee?.name ?? "Unassigned"}</div>
                          </>
                        ) : <span className="text-slate-500">All stages done</span>}
                      </td>
                      <td className="px-3 py-3"><Progress task={task} /></td>
                      <td className={`px-3 py-3 text-xs ${isOverdue(task) ? "font-semibold text-red-700" : "text-slate-600"}`}>
                        {task.dueDate ? formatDay(task.dueDate) : "—"}
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
                  <Link href={`/tasks/${task.id}`} className="block rounded-lg border border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium"><span className="text-slate-400">{taskRef(task.id)}</span> {task.title}</p>
                        <p className="mt-0.5 text-xs text-slate-500">{task.client.name} · {task.taskType.name}</p>
                      </div>
                      <StatusBadge status={task.status} />
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <Progress task={task} />
                      {task.dueDate && (
                        <span className={isOverdue(task) ? "font-semibold text-red-700" : "text-slate-600"}>
                          Due {formatDay(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            {nextBefore !== null && (
              <div className="text-center">
                <button type="button" onClick={() => void loadOlder()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100">
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {showNew && (
        <NewTaskDialog
          onClose={() => setShowNew(false)}
          onCreated={(task) => router.push(`/tasks/${task.id}`)}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: TaskListItem["status"] }) {
  return (
    <span className={`inline-flex shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>
      {status}
    </span>
  );
}

function Progress({ task }: { task: TaskListItem }) {
  const percent = task.stagesTotal ? Math.round((task.stagesCompleted / task.stagesTotal) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
        <div className="h-full rounded-full bg-blue-600" style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-slate-500">{task.stagesCompleted}/{task.stagesTotal}</span>
    </div>
  );
}
