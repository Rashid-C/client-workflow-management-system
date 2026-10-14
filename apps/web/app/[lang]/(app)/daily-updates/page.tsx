
'use client';

import { useMemo, useState } from 'react';

type UpdateStatus = 'Completed' | 'In progress' | 'Blocked';

type DailyUpdate = {
  id: number;
  employee: string;
  role: string;
  client: string;
  task: string;
  date: string;
  hours: number;
  status: UpdateStatus;
  notes: string;
};

const initialUpdates: DailyUpdate[] = [
  {
    id: 1,
    employee: 'Arun Kumar',
    role: 'Accountant',
    client: 'Al Noor Trading',
    task: 'VAT return preparation',
    date: '2026-10-11',
    hours: 3.5,
    status: 'Completed',
    notes: 'Prepared the VAT summary and verified purchase invoices.',
  },
  {
    id: 2,
    employee: 'Fathima Shirin',
    role: 'Auditor',
    client: 'Bluewave Services',
    task: 'Bank statement reconciliation',
    date: '2026-10-11',
    hours: 2,
    status: 'In progress',
    notes: 'Matched transactions. A few entries still need verification.',
  },
  {
    id: 3,
    employee: 'Rahul Das',
    role: 'Accountant',
    client: 'Crescent LLC',
    task: 'Financial statement review',
    date: '2026-10-11',
    hours: 1.5,
    status: 'Blocked',
    notes: 'Waiting for the client to provide the missing bank statement.',
  },
  {
    id: 4,
    employee: 'Arun Kumar',
    role: 'Accountant',
    client: 'Bluewave Services',
    task: 'Expense documentation',
    date: '2026-10-10',
    hours: 2.5,
    status: 'Completed',
    notes: 'Reviewed supporting documents and updated the expense records.',
  },
];

const statusStyles: Record<UpdateStatus, string> = {
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'In progress': 'bg-navy-50 text-navy-700 ring-navy-600/20',
  Blocked: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DailyUpdatesPage() {
  const [updates, setUpdates] = useState(initialUpdates);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('2026-10-11');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const [employee, setEmployee] = useState('');
  const [client, setClient] = useState('');
  const [task, setTask] = useState('');
  const [hours, setHours] = useState('1');
  const [status, setStatus] = useState<UpdateStatus>('In progress');
  const [notes, setNotes] = useState('');

  const filteredUpdates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return updates.filter((update) => {
      const matchesSearch =
        !query ||
        [
          update.employee,
          update.client,
          update.task,
          update.notes,
        ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'All' || update.status === statusFilter;

      const matchesDate =
        dateFilter === 'All' || update.date === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [updates, search, statusFilter, dateFilter]);

  const totalHours = filteredUpdates.reduce(
    (total, update) => total + update.hours,
    0,
  );

  const completedCount = filteredUpdates.filter(
    (update) => update.status === 'Completed',
  ).length;

  const blockedCount = filteredUpdates.filter(
    (update) => update.status === 'Blocked',
  ).length;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!employee.trim() || !client.trim() || !task.trim()) {
      setMessage('Please fill in the employee, client and task fields.');
      return;
    }

    const parsedHours = Number(hours);

    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      setMessage('Enter a valid number of hours greater than zero.');
      return;
    }

    const newUpdate: DailyUpdate = {
      id: Date.now(),
      employee: employee.trim(),
      role: 'Team member',
      client: client.trim(),
      task: task.trim(),
      date: dateFilter === 'All' ? '2026-10-11' : dateFilter,
      hours: parsedHours,
      status,
      notes: notes.trim() || 'No additional notes.',
    };

    setUpdates((current) => [newUpdate, ...current]);
    setSearch('');
    setStatusFilter('All');
    setDateFilter(newUpdate.date);
    setEmployee('');
    setClient('');
    setTask('');
    setHours('1');
    setStatus('In progress');
    setNotes('');
    setMessage('Daily update added successfully.');
    setShowForm(false);
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-brand-700">
              Team management
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Daily Updates
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review daily work reports, track time spent, and identify tasks
              waiting on clients or team members.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setMessage('');
            }}
            className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
          >
            {showForm ? 'Cancel' : '+ Add daily update'}
          </button>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Frontend prototype:</strong> Updates currently use sample
          data and browser memory. They are not saved to the database yet.
        </div>

        {message && (
          <div
            role="status"
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            {message}
          </div>
        )}

        {showForm && (
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-900">
                Record daily work
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter the work completed or the progress made today.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Employee *
                  </span>
                  <input
                    value={employee}
                    onChange={(event) => setEmployee(event.target.value)}
                    placeholder="Employee name"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Client *
                  </span>
                  <input
                    value={client}
                    onChange={(event) => setClient(event.target.value)}
                    placeholder="Client name"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Task *
                  </span>
                  <input
                    value={task}
                    onChange={(event) => setTask(event.target.value)}
                    placeholder="Work performed"
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Hours spent *
                  </span>
                  <input
                    type="number"
                    min="0.25"
                    max="24"
                    step="0.25"
                    value={hours}
                    onChange={(event) => setHours(event.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Status
                  </span>
                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as UpdateStatus)
                    }
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="In progress">In progress</option>
                    <option value="Completed">Completed</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </label>

                <label className="block sm:col-span-2 lg:col-span-1">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Work date
                  </span>
                  <input
                    type="date"
                    value={dateFilter === 'All' ? '2026-10-11' : dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <label className="block sm:col-span-2 lg:col-span-3">
                  <span className="mb-1.5 block text-sm font-medium text-slate-700">
                    Progress notes / blocker details
                  </span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    placeholder="What was done? What remains? Is anything blocking progress?"
                    className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </label>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:ring-offset-2"
                >
                  Add update
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Work reports"
            value={filteredUpdates.length}
            detail="Matching current filters"
          />
          <SummaryCard
            label="Hours reported"
            value={`${totalHours.toFixed(1)}h`}
            detail="Combined time reported"
          />
          <SummaryCard
            label="Completed"
            value={completedCount}
            detail="Reports marked complete"
          />
          <SummaryCard
            label="Blocked"
            value={blockedCount}
            detail="Reports needing attention"
            alert={blockedCount > 0}
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Work report history
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search and filter employee updates.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Search
                  </span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Employee, client, task..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Work date
                  </span>
                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="All">All dates</option>
                    <option value="2026-10-11">11 Oct 2026</option>
                    <option value="2026-10-10">10 Oct 2026</option>
                  </select>
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500">
                    Status
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-100"
                  >
                    <option value="All">All statuses</option>
                    <option value="Completed">Completed</option>
                    <option value="In progress">In progress</option>
                    <option value="Blocked">Blocked</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {filteredUpdates.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-500">
                —
              </div>
              <h3 className="mt-4 text-sm font-semibold text-slate-900">
                No updates found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Change the filters or add a new daily update.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        'Employee',
                        'Client / task',
                        'Date',
                        'Hours',
                        'Status',
                        'Progress notes',
                      ].map((heading) => (
                        <th
                          key={heading}
                          className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUpdates.map((update) => (
                      <tr key={update.id} className="align-top hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {update.employee}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {update.role}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-800">
                            {update.client}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {update.task}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(update.date)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-medium tabular-nums text-slate-700">
                          {update.hours.toFixed(2).replace(/\.?0+$/, '')}h
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[update.status]}`}
                          >
                            {update.status}
                          </span>
                        </td>
                        <td className="max-w-sm px-5 py-4 text-sm leading-5 text-slate-600">
                          {update.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-200 md:hidden">
                {filteredUpdates.map((update) => (
                  <article key={update.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-slate-900">
                          {update.employee}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {update.role}
                        </p>
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[update.status]}`}
                      >
                        {update.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {update.task}
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        {update.client}
                      </p>
                    </div>
                    <p className="text-sm leading-5 text-slate-600">
                      {update.notes}
                    </p>
                    <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>{formatDate(update.date)}</span>
                      <span className="font-semibold text-slate-700">
                        {update.hours}h reported
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
            Showing {filteredUpdates.length} of {updates.length} reports
          </div>
        </section>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  alert = false,
}: {
  label: string;
  value: string | number;
  detail: string;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p
        className={`mt-3 text-3xl font-semibold tracking-tight ${
          alert ? 'text-rose-700' : 'text-slate-900'
        }`}
      >
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
