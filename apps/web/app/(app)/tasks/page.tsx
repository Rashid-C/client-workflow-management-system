
'use client';

import { useMemo, useState } from 'react';

type TaskStatus = 'Pending' | 'In Progress' | 'Blocked' | 'Completed';
type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

type Task = {
  id: string;
  title: string;
  client: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
};

const initialTasks: Task[] = [
  {
    id: 'TSK-001',
    title: 'Prepare quarterly accounts',
    client: 'Al Noor Trading',
    assignee: 'Ahmed Khan',
    priority: 'High',
    status: 'In Progress',
    dueDate: '2026-10-14',
  },
  {
    id: 'TSK-002',
    title: 'Review VAT documents',
    client: 'Bluewave Services',
    assignee: 'Sara Thomas',
    priority: 'Urgent',
    status: 'Blocked',
    dueDate: '2026-10-12',
  },
  {
    id: 'TSK-003',
    title: 'Verify expense records',
    client: 'Al Noor Trading',
    assignee: 'Mohammed Ali',
    priority: 'Medium',
    status: 'Pending',
    dueDate: '2026-10-17',
  },
  {
    id: 'TSK-004',
    title: 'Complete audit checklist',
    client: 'Crescent Consultants',
    assignee: 'Sara Thomas',
    priority: 'High',
    status: 'Completed',
    dueDate: '2026-10-09',
  },
  {
    id: 'TSK-005',
    title: 'Collect missing invoices',
    client: 'Greenline Supplies',
    assignee: 'Unassigned',
    priority: 'Low',
    status: 'Pending',
    dueDate: '2026-10-20',
  },
];

const statuses: TaskStatus[] = [
  'Pending',
  'In Progress',
  'Blocked',
  'Completed',
];

const statusStyles: Record<TaskStatus, string> = {
  Pending: 'bg-slate-100 text-slate-700',
  'In Progress': 'bg-blue-50 text-blue-700',
  Blocked: 'bg-red-50 text-red-700',
  Completed: 'bg-emerald-50 text-emerald-700',
};

const priorityStyles: Record<TaskPriority, string> = {
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

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');

  const [title, setTitle] = useState('');
  const [client, setClient] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');

  const filteredTasks = useMemo(() => {
    const query = search.trim().toLowerCase();

    return tasks.filter((task) => {
      const matchesSearch = [
        task.id,
        task.title,
        task.client,
        task.assignee,
      ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'All' || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === 'All' || task.priority === priorityFilter;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  function createTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError('');

    if (!title.trim() || !client.trim() || !dueDate) {
      setFormError('Enter a task title, client, and due date.');
      return;
    }

    const newTask: Task = {
      id: `TSK-${String(Date.now()).slice(-6)}`,
      title: title.trim(),
      client: client.trim(),
      assignee: assignee.trim() || 'Unassigned',
      priority,
      status: 'Pending',
      dueDate,
    };

    setTasks((current) => [newTask, ...current]);
    setSearch('');
    setStatusFilter('All');
    setPriorityFilter('All');
    setTitle('');
    setClient('');
    setAssignee('');
    setPriority('Medium');
    setDueDate('');
    setShowForm(false);
  }

  const pendingCount = tasks.filter((task) => task.status === 'Pending').length;
  const progressCount = tasks.filter((task) => task.status === 'In Progress').length;
  const blockedCount = tasks.filter((task) => task.status === 'Blocked').length;
  const completedCount = tasks.filter((task) => task.status === 'Completed').length;

  return (
    <div className="mx-auto w-full max-w-[1600px] p-5 sm:p-7 lg:p-10">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-sm font-medium text-teal-800">
            OPERATIONS
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Tasks
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Assign work, track progress, and keep client engagements moving.
          </p>
          <p className="mt-2 text-xs font-medium text-amber-700">
            Preview mode · Sample data only
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormError('');
            setShowForm((current) => !current);
          }}
          className="inline-flex min-h-10 items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          {showForm ? 'Cancel' : '+ New task'}
        </button>
      </header>

      <section aria-label="Task summary" className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Pending', count: pendingCount, style: 'text-slate-900' },
          { label: 'In progress', count: progressCount, style: 'text-blue-700' },
          { label: 'Blocked', count: blockedCount, style: 'text-red-700' },
          { label: 'Completed', count: completedCount, style: 'text-emerald-700' },
        ].map((item) => (
          <article key={item.label} className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            <p className={`mt-3 text-2xl font-semibold ${item.style}`}>
              {item.count}
            </p>
          </article>
        ))}
      </section>

      {showForm && (
        <section className="mb-8 rounded-lg border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-900">
            Create task
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            This preview adds the task to the current page only. It is not saved to the database.
          </p>

          <form onSubmit={createTask} className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="task-title" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Task title *
                </label>
                <input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  required
                  maxLength={160}
                  placeholder="e.g. Prepare monthly accounts"
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                />
              </div>

              <div>
                <label htmlFor="task-client" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Client *
                </label>
                <input
                  id="task-client"
                  value={client}
                  onChange={(event) => setClient(event.target.value)}
                  required
                  maxLength={160}
                  placeholder="Client or company name"
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                />
              </div>

              <div>
                <label htmlFor="task-assignee" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Assignee
                </label>
                <input
                  id="task-assignee"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  maxLength={120}
                  placeholder="Leave blank if unassigned"
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
                />
              </div>

              <div>
                <label htmlFor="task-priority" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Priority
                </label>
                <select
                  id="task-priority"
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as TaskPriority)}
                  className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-700"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Urgent</option>
                </select>
              </div>

              <div>
                <label htmlFor="task-due-date" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Due date *
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                  className="min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700"
                />
              </div>
            </div>

            {formError && (
              <p role="alert" className="text-sm text-red-700">
                {formError}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button type="submit" className="min-h-10 rounded-md bg-teal-800 px-4 text-sm font-medium text-white hover:bg-teal-900">
                Add task
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="min-h-10 rounded-md border border-slate-300 px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      <section aria-labelledby="task-list-heading" className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-5">
          <h2 id="task-list-heading" className="text-base font-semibold text-slate-900">
            Task directory
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredTasks.length} of {tasks.length} tasks
          </p>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_180px_160px]">
          <div>
            <label htmlFor="task-search" className="sr-only">Search tasks</label>
            <input
              id="task-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search task, client, assignee, or ID..."
              className="min-h-10 w-full rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15"
            />
          </div>

          <div>
            <label htmlFor="task-status-filter" className="sr-only">Filter by status</label>
            <select
              id="task-status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="All">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="task-priority-filter" className="sr-only">Filter by priority</label>
            <select
              id="task-priority-filter"
              value={priorityFilter}
              onChange={(event) => setPriorityFilter(event.target.value)}
              className="min-h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm"
            >
              <option value="All">All priorities</option>
              <option value="Low">Low priority</option>
              <option value="Medium">Medium priority</option>
              <option value="High">High priority</option>
              <option value="Urgent">Urgent priority</option>
            </select>
          </div>
        </div>

        {filteredTasks.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-300 px-4 py-12 text-center">
            <h3 className="text-sm font-semibold text-slate-900">No tasks found</h3>
            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] table-fixed text-left text-sm">
              <colgroup>
                <col className="w-[11%]" />
                <col className="w-[25%]" />
                <col className="w-[17%]" />
                <col className="w-[15%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
                <col className="w-[9%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th scope="col" className="px-3 py-3">Task ID</th>
                  <th scope="col" className="px-3 py-3">Task</th>
                  <th scope="col" className="px-3 py-3">Client</th>
                  <th scope="col" className="px-3 py-3">Assignee</th>
                  <th scope="col" className="px-3 py-3">Priority</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Due date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="align-top hover:bg-slate-50/70">
                    <td className="break-words px-3 py-4 text-xs font-medium text-slate-500">{task.id}</td>
                    <td className="break-words px-3 py-4 font-medium text-slate-900">{task.title}</td>
                    <td className="break-words px-3 py-4 text-slate-600">{task.client}</td>
                    <td className="break-words px-3 py-4 text-slate-600">{task.assignee}</td>
                    <td className={`break-words px-3 py-4 font-medium ${priorityStyles[task.priority]}`}>{task.priority}</td>
                    <td className="px-3 py-4">
                      <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[task.status]}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="break-words px-3 py-4 text-slate-600">{formatDate(task.dueDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
