
'use client';

import { useMemo, useState } from 'react';

type TimeLog = {
  id: number;
  employee: string;
  client: string;
  task: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  notes: string;
};

const initialLogs: TimeLog[] = [
  {
    id: 1,
    employee: 'Arun Kumar',
    client: 'Al Noor Trading LLC',
    task: 'VAT return preparation',
    date: '2026-10-11',
    startTime: '09:00',
    endTime: '11:30',
    hours: 2.5,
    notes: 'Reviewed purchase invoices and prepared the VAT summary.',
  },
  {
    id: 2,
    employee: 'Fathima Shirin',
    client: 'Bluewave Services LLC',
    task: 'Bank reconciliation',
    date: '2026-10-11',
    startTime: '10:00',
    endTime: '12:00',
    hours: 2,
    notes: 'Matched transactions and flagged outstanding entries.',
  },
  {
    id: 3,
    employee: 'Rahul Das',
    client: 'Crescent General Trading',
    task: 'Financial statement review',
    date: '2026-10-11',
    startTime: '13:00',
    endTime: '15:30',
    hours: 2.5,
    notes: 'Reviewed account balances and supporting records.',
  },
  {
    id: 4,
    employee: 'Arun Kumar',
    client: 'Bluewave Services LLC',
    task: 'Expense documentation',
    date: '2026-10-10',
    startTime: '14:00',
    endTime: '16:00',
    hours: 2,
    notes: 'Checked supporting documents and updated expense records.',
  },
  {
    id: 5,
    employee: 'Fathima Shirin',
    client: 'Al Noor Trading LLC',
    task: 'Client document review',
    date: '2026-10-10',
    startTime: '09:30',
    endTime: '11:00',
    hours: 1.5,
    notes: 'Reviewed the latest documents received from the client.',
  },
];

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function calculateHours(start: string, end: string) {
  const [startHour, startMinute] = start.split(':').map(Number);
  const [endHour, endMinute] = end.split(':').map(Number);

  const startTotal = startHour * 60 + startMinute;
  const endTotal = endHour * 60 + endMinute;

  return (endTotal - startTotal) / 60;
}

export default function TimeLogsPage() {
  const [logs, setLogs] = useState(initialLogs);
  const [search, setSearch] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const [employee, setEmployee] = useState('');
  const [client, setClient] = useState('');
  const [task, setTask] = useState('');
  const [date, setDate] = useState('2026-10-11');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [notes, setNotes] = useState('');

  const employees = useMemo(
    () => [...new Set(logs.map((log) => log.employee))].sort(),
    [logs],
  );

  const clients = useMemo(
    () => [...new Set(logs.map((log) => log.client))].sort(),
    [logs],
  );

  const dates = useMemo(
    () => [...new Set(logs.map((log) => log.date))].sort().reverse(),
    [logs],
  );

  const filteredLogs = useMemo(() => {
    const query = search.trim().toLowerCase();

    return logs.filter((log) => {
      const matchesSearch =
        !query ||
        [log.employee, log.client, log.task, log.notes].some((value) =>
          value.toLowerCase().includes(query),
        );

      return (
        matchesSearch &&
        (employeeFilter === 'All' || log.employee === employeeFilter) &&
        (clientFilter === 'All' || log.client === clientFilter) &&
        (dateFilter === 'All' || log.date === dateFilter)
      );
    });
  }, [logs, search, employeeFilter, clientFilter, dateFilter]);

  const totalHours = filteredLogs.reduce((sum, log) => sum + log.hours, 0);

  const employeeCount = new Set(
    filteredLogs.map((log) => log.employee),
  ).size;

  const clientCount = new Set(filteredLogs.map((log) => log.client)).size;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!employee.trim() || !client.trim() || !task.trim() || !date) {
      setMessage('Please complete the employee, client, task and date fields.');
      return;
    }

    const hours = calculateHours(startTime, endTime);

    if (!Number.isFinite(hours) || hours <= 0) {
      setMessage('End time must be later than start time on the same day.');
      return;
    }

    const newLog: TimeLog = {
      id: Date.now(),
      employee: employee.trim(),
      client: client.trim(),
      task: task.trim(),
      date,
      startTime,
      endTime,
      hours,
      notes: notes.trim() || 'No additional notes.',
    };

    setLogs((current) => [newLog, ...current]);
    setSearch('');
    setEmployeeFilter('All');
    setClientFilter('All');
    setDateFilter('All');
    setEmployee('');
    setClient('');
    setTask('');
    setStartTime('09:00');
    setEndTime('10:00');
    setNotes('');
    setMessage('Time entry added successfully.');
    setShowForm(false);
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">
              Productivity tracking
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Time Logs
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Track employee hours against client assignments and review the
              time recorded across your team.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setMessage('');
            }}
            className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
          >
            {showForm ? 'Cancel' : '+ Log time'}
          </button>
        </header>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Frontend prototype:</strong> Time entries use sample data and
          browser memory. They are not saved to the database yet.
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
            <h2 className="text-lg font-semibold text-slate-900">
              Record time entry
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Enter the work period for a client assignment.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Employee *">
                  <input
                    required
                    value={employee}
                    onChange={(event) => setEmployee(event.target.value)}
                    placeholder="Employee name"
                    className={inputClass}
                  />
                </Field>

                <Field label="Client *">
                  <input
                    required
                    value={client}
                    onChange={(event) => setClient(event.target.value)}
                    placeholder="Client name"
                    className={inputClass}
                  />
                </Field>

                <Field label="Task / assignment *">
                  <input
                    required
                    value={task}
                    onChange={(event) => setTask(event.target.value)}
                    placeholder="Work performed"
                    className={inputClass}
                  />
                </Field>

                <Field label="Work date *">
                  <input
                    required
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Start time">
                  <input
                    required
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="End time">
                  <input
                    required
                    type="time"
                    value={endTime}
                    onChange={(event) => setEndTime(event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <div className="rounded-lg border border-teal-100 bg-teal-50 p-4">
                  <p className="text-sm font-medium text-teal-800">
                    Calculated duration
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-teal-900">
                    {calculateHours(startTime, endTime) > 0
                      ? `${calculateHours(startTime, endTime).toFixed(2)} h`
                      : '—'}
                  </p>
                  <p className="mt-1 text-xs text-teal-700">
                    Based on start and end times
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Work notes">
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Describe the work completed"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800"
                >
                  Save time entry
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Logged hours"
            value={`${totalHours.toFixed(2)} h`}
            detail="Hours in the current result set"
          />
          <SummaryCard
            label="Time entries"
            value={filteredLogs.length}
            detail="Matching records"
          />
          <SummaryCard
            label="Employees"
            value={employeeCount}
            detail="Employees represented"
          />
          <SummaryCard
            label="Clients"
            value={clientCount}
            detail="Clients represented"
          />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Time entry register
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Review recorded hours by employee, client and date.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Search">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Task, client, employee..."
                    className={inputClass}
                  />
                </Field>

                <Field label="Employee">
                  <select
                    value={employeeFilter}
                    onChange={(event) => setEmployeeFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All employees</option>
                    {employees.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Client">
                  <select
                    value={clientFilter}
                    onChange={(event) => setClientFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All clients</option>
                    {clients.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Work date">
                  <select
                    value={dateFilter}
                    onChange={(event) => setDateFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All dates</option>
                    {dates.map((workDate) => (
                      <option key={workDate} value={workDate}>
                        {formatDate(workDate)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-semibold text-slate-900">
                No time entries found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Change the filters or record a new time entry.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[950px] divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        'Employee',
                        'Client / task',
                        'Work date',
                        'Time period',
                        'Hours',
                        'Notes',
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
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="align-top hover:bg-slate-50/70">
                        <td className="px-5 py-4 text-sm font-semibold text-slate-900">
                          {log.employee}
                        </td>
                        <td className="px-5 py-4">
                          <p className="text-sm font-medium text-slate-800">
                            {log.client}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {log.task}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {formatDate(log.date)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {log.startTime} – {log.endTime}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-semibold tabular-nums text-slate-800">
                          {log.hours.toFixed(2)} h
                        </td>
                        <td className="max-w-xs px-5 py-4 text-sm leading-5 text-slate-500">
                          {log.notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-200 md:hidden">
                {filteredLogs.map((log) => (
                  <article key={log.id} className="space-y-3 p-4">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        {log.employee}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {log.client}
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {log.task}
                      </p>
                    </div>
                    <p className="text-sm leading-5 text-slate-500">
                      {log.notes}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                      <span>{formatDate(log.date)}</span>
                      <span>{log.startTime} – {log.endTime}</span>
                      <span className="font-semibold text-slate-800">
                        {log.hours.toFixed(2)} h
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
            Showing {filteredLogs.length} of {logs.length} time entries
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}

function SummaryCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
