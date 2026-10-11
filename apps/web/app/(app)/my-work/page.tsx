
'use client';

import { useEffect, useMemo, useState } from 'react';

type WorkStatus = 'Pending' | 'In Progress' | 'Blocked' | 'Completed';
type WorkPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

type WorkItem = {
  id: string;
  title: string;
  client: string;
  priority: WorkPriority;
  status: WorkStatus;
  dueDate: string;
  blockedReason?: string;
};

const initialWork: WorkItem[] = [
  {
    id: 'TSK-002',
    title: 'Review VAT documents',
    client: 'Bluewave Services',
    priority: 'Urgent',
    status: 'Blocked',
    dueDate: '2026-10-12',
    blockedReason: 'Waiting for missing client documents',
  },
  {
    id: 'TSK-003',
    title: 'Verify expense records',
    client: 'Al Noor Trading',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '2026-10-17',
  },
  {
    id: 'TSK-006',
    title: 'Reconcile bank statements',
    client: 'Crescent Consultants',
    priority: 'High',
    status: 'In Progress',
    dueDate: '2026-10-14',
  },
  {
    id: 'TSK-007',
    title: 'Prepare payroll summary',
    client: 'Greenline Supplies',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '2026-10-19',
  },
  {
    id: 'TSK-008',
    title: 'Submit monthly report',
    client: 'Bluewave Services',
    priority: 'High',
    status: 'Completed',
    dueDate: '2026-10-09',
  },
];

const statusStyles: Record<WorkStatus, string> = {
  Pending: 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  Blocked: 'bg-red-50 text-red-700',
  Completed: 'bg-emerald-50 text-emerald-700',
};

const priorityStyles: Record<WorkPriority, string> = {
  Low: 'text-slate-500',
  Medium: 'text-blue-700',
  High: 'text-orange-700',
  Urgent: 'text-red-700',
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

function getDaysUntil(date: string, today: string) {
  const todayUtc = new Date(`${today}T00:00:00Z`).getTime();
  const dueUtc = new Date(`${date}T00:00:00Z`).getTime();

  return Math.round((dueUtc - todayUtc) / 86_400_000);
}

export default function MyWorkPage() {
  const [today, setToday] = useState<string | null>(null);
  const [work, setWork] = useState<WorkItem[]>(initialWork);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const now = new Date();

    const localToday = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    setToday(localToday);
  }, []);

  const filteredWork = useMemo(() => {
    const query = search.trim().toLowerCase();

    return work.filter((item) => {
      const matchesSearch = [item.id, item.title, item.client].some(
        (value) => value.toLowerCase().includes(query),
      );

      const matchesStatus =
        statusFilter === 'All' || item.status === statusFilter;

      const matchesCompleted =
        showCompleted || item.status !== 'Completed';

      return matchesSearch && matchesStatus && matchesCompleted;
    });
  }, [work, search, statusFilter, showCompleted]);

  const openCount = work.filter(
    (item) => item.status !== 'Completed',
  ).length;

  const inProgressCount = work.filter(
    (item) => item.status === 'In Progress',
  ).length;

  const blockedCount = work.filter(
    (item) => item.status === 'Blocked',
  ).length;

  const completedCount = work.filter(
    (item) => item.status === 'Completed',
  ).length;

  function markCompleted(id: string) {
    setWork((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: 'Completed' } : item,
      ),
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1600px] p-5 sm:p-7 lg:p-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <p className="mb-2 text-sm font-medium text-teal-800">
          WORKSPACE
        </p>

        <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
          My Work
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Focus on your assigned work, keep track of deadlines, and identify
          anything blocking progress.
        </p>

        <p className="mt-2 text-xs font-medium text-amber-700">
          Preview mode · Sample data only
        </p>
      </header>

      <section
        aria-label="My work summary"
        className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4"
      >
        {[
          {
            label: 'Open work',
            count: openCount,
            detail: 'Not yet completed',
            style: 'text-slate-900',
          },
          {
            label: 'In progress',
            count: inProgressCount,
            detail: 'Currently being worked on',
            style: 'text-blue-700',
          },
          {
            label: 'Blocked',
            count: blockedCount,
            detail: 'Needs attention',
            style: 'text-red-700',
          },
          {
            label: 'Completed',
            count: completedCount,
            detail: 'Finished tasks',
            style: 'text-emerald-700',
          },
        ].map((item) => (
          <article
            key={item.label}
            className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5"
          >
            <p className="text-sm font-medium text-slate-500">
              {item.label}
            </p>
            <p className={`mt-3 text-2xl font-semibold ${item.style}`}>
              {item.count}
            </p>
            <p className="mt-2 text-xs text-slate-500">
              {item.detail}
            </p>
          </article>
        ))}
      </section>

      {blockedCount > 0 && (
        <section
          aria-labelledby="blocked-work-heading"
          className="mb-8 rounded-lg border border-red-200 bg-red-50/60 p-5"
        >
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-red-100 text-sm font-semibold text-red-700"
            >
              !
            </span>

            <div className="min-w-0">
              <h2
                id="blocked-work-heading"
                className="text-sm font-semibold text-red-900"
              >
                Blocked work needs attention
              </h2>

              {work
                .filter((item) => item.status === 'Blocked')
                .map((item) => (
                  <div
                    key={item.id}
                    className="mt-2 text-sm text-red-800"
                  >
                    <p className="font-medium">
                      {item.title} · {item.client}
                    </p>
                    <p className="mt-1 text-red-700">
                      {item.blockedReason ||
                        'A reason has not been recorded.'}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </section>
      )}

      <section
        aria-labelledby="my-work-list-heading"
        className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6"
      >
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2
              id="my-work-list-heading"
              className="text-base font-semibold text-slate-900"
            >
              Assigned work
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredWork.length} of {work.length} tasks shown
            </p>
          </div>

          <label className="inline-flex min-h-9 items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(event) => setShowCompleted(event.target.checked)}
              className="size-4 rounded border-slate-300 accent-teal-800"
            />
            Show completed
          </label>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_190px]">
          <div>
            <label htmlFor="my-work-search" className="sr-only">
              Search assigned work
            </label>
            <input
              id="my-work-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search task, client, or ID..."
              className="min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </div>

          <div>
            <label htmlFor="my-work-status" className="sr-only">
              Filter by status
            </label>
            <select
              id="my-work-status"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Blocked">Blocked</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {filteredWork.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 px-4 py-12 text-center">
            <h3 className="text-sm font-semibold text-slate-900">
              No work found
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredWork.map((item) => {
              const daysUntil = today
                ? getDaysUntil(item.dueDate, today)
                : null;

              const overdue =
                daysUntil !== null &&
                daysUntil < 0 &&
                item.status !== 'Completed';

              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-slate-200 p-4 transition-colors hover:border-slate-300 sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-slate-400">
                          {item.id}
                        </span>

                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[item.status]}`}
                        >
                          {item.status}
                        </span>

                        <span
                          className={`text-xs font-semibold ${priorityStyles[item.priority]}`}
                        >
                          {item.priority} priority
                        </span>
                      </div>

                      <h3 className="mt-2 break-words text-sm font-semibold text-slate-900 sm:text-base">
                        {item.title}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {item.client}
                      </p>

                      <p
                        className={`mt-3 text-xs font-medium ${overdue ? 'text-red-700' : 'text-slate-500'}`}
                      >
                        Due {formatDate(item.dueDate)}
                        {overdue
                          ? ` · ${Math.abs(daysUntil ?? 0)} day${Math.abs(daysUntil ?? 0) === 1 ? '' : 's'} overdue`
                          : daysUntil === 0 && item.status !== 'Completed'
                            ? ' · Due today'
                            : daysUntil === 1 &&
                                item.status !== 'Completed'
                              ? ' · Due tomorrow'
                              : ''}
                      </p>

                      {item.status === 'Blocked' && item.blockedReason && (
                        <p className="mt-2 text-xs text-red-700">
                          Blocked: {item.blockedReason}
                        </p>
                      )}
                    </div>

                    {item.status !== 'Completed' && (
                      <button
                        type="button"
                        onClick={() => markCompleted(item.id)}
                        className="min-h-10 shrink-0 rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                      >
                        Mark completed
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        Sample tasks are provided for interface testing. Completion changes
        are temporary and will reset on refresh.
      </p>
    </div>
  );
}
