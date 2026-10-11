
'use client';

import { useMemo, useState } from 'react';

type LeadStatus = 'New' | 'Contacted' | 'Qualified' | 'Won' | 'Lost';

type Lead = {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  assignedTo: string;
  nextFollowUp: string;
  notes: string;
};

const initialLeads: Lead[] = [
  {
    id: 1,
    name: 'Mohammed Faisal',
    company: 'Faisal Trading LLC',
    email: 'faisal@example.com',
    phone: '+971 50 123 4567',
    source: 'Referral',
    status: 'Qualified',
    assignedTo: 'Arun Kumar',
    nextFollowUp: '2026-10-12',
    notes: 'Interested in monthly bookkeeping and VAT filing.',
  },
  {
    id: 2,
    name: 'Sara Thomas',
    company: 'Northstar Consulting',
    email: 'sara@example.com',
    phone: '+971 55 234 5678',
    source: 'Website',
    status: 'Contacted',
    assignedTo: 'Fathima Shirin',
    nextFollowUp: '2026-10-13',
    notes: 'Sent service proposal. Follow up regarding the quotation.',
  },
  {
    id: 3,
    name: 'Ahmed Rahman',
    company: 'Rahman General Trading',
    email: 'ahmed@example.com',
    phone: '+971 52 345 6789',
    source: 'Walk-in',
    status: 'New',
    assignedTo: 'Rahul Das',
    nextFollowUp: '2026-10-11',
    notes: 'Initial enquiry about accounting and audit services.',
  },
  {
    id: 4,
    name: 'Priya Nair',
    company: 'Evergreen Services LLC',
    email: 'priya@example.com',
    phone: '+971 56 456 7890',
    source: 'Referral',
    status: 'Won',
    assignedTo: 'Arun Kumar',
    nextFollowUp: '',
    notes: 'Service agreement confirmed. Ready for client onboarding.',
  },
  {
    id: 5,
    name: 'Omar Khalid',
    company: 'Khalid Logistics',
    email: 'omar@example.com',
    phone: '+971 54 567 8901',
    source: 'Social media',
    status: 'Lost',
    assignedTo: 'Fathima Shirin',
    nextFollowUp: '',
    notes: 'Prospect selected another service provider.',
  },
];

const statusStyles: Record<LeadStatus, string> = {
  New: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  Contacted: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  Qualified: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  Won: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Lost: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

function formatDate(date: string) {
  if (!date) return 'Not scheduled';

  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getDateLabel(date: string, today: string) {
  if (!date || !today) return '';

  const due = Date.parse(`${date}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  const days = Math.round((due - current) / 86_400_000);

  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';

  return '';
}

export default function LeadsPage() {
  const [leads, setLeads] = useState(initialLeads);
  const [today] = useState(() => '2026-10-11');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [followUpFilter, setFollowUpFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);

  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Referral');
  const [status, setStatus] = useState<LeadStatus>('New');
  const [assignedTo, setAssignedTo] = useState('');
  const [nextFollowUp, setNextFollowUp] = useState('');
  const [notes, setNotes] = useState('');

  const assignees = useMemo(
    () => [...new Set(leads.map((lead) => lead.assignedTo).filter(Boolean))].sort(),
    [leads],
  );

  const filteredLeads = useMemo(() => {
    const query = search.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesSearch =
        !query ||
        [
          lead.name,
          lead.company,
          lead.email,
          lead.phone,
          lead.notes,
        ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'All' || lead.status === statusFilter;

      const matchesAssignee =
        assigneeFilter === 'All' || lead.assignedTo === assigneeFilter;

      const label = getDateLabel(lead.nextFollowUp, today);
      const matchesFollowUp =
        followUpFilter === 'All' ||
        (followUpFilter === 'Overdue' && label === 'Overdue') ||
        (followUpFilter === 'Today' && label === 'Today') ||
        (followUpFilter === 'Upcoming' &&
          lead.nextFollowUp >= today &&
          Boolean(lead.nextFollowUp));

      return (
        matchesSearch &&
        matchesStatus &&
        matchesAssignee &&
        matchesFollowUp
      );
    });
  }, [leads, search, statusFilter, assigneeFilter, followUpFilter, today]);

  const openCount = leads.filter(
    (lead) => !['Won', 'Lost'].includes(lead.status),
  ).length;

  const overdueCount = leads.filter(
    (lead) => getDateLabel(lead.nextFollowUp, today) === 'Overdue',
  ).length;

  const todayCount = leads.filter(
    (lead) => getDateLabel(lead.nextFollowUp, today) === 'Today',
  ).length;

  const wonCount = leads.filter((lead) => lead.status === 'Won').length;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || !company.trim()) {
      setMessage('Please enter the contact name and company.');
      return;
    }

    const newLead: Lead = {
      id: Date.now(),
      name: name.trim(),
      company: company.trim(),
      email: email.trim(),
      phone: phone.trim(),
      source,
      status,
      assignedTo: assignedTo.trim(),
      nextFollowUp,
      notes: notes.trim(),
    };

    setLeads((current) => [newLead, ...current]);
    setName('');
    setCompany('');
    setEmail('');
    setPhone('');
    setSource('Referral');
    setStatus('New');
    setAssignedTo('');
    setNextFollowUp('');
    setNotes('');
    setSearch('');
    setStatusFilter('All');
    setAssigneeFilter('All');
    setFollowUpFilter('All');
    setShowForm(false);
    setMessage('Lead added successfully.');
  }

  function updateStatus(id: number, nextStatus: LeadStatus) {
    setLeads((current) =>
      current.map((lead) =>
        lead.id === id ? { ...lead, status: nextStatus } : lead,
      ),
    );
    setMessage('Lead status updated in this prototype.');
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">
              Business development
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Leads &amp; Follow-ups
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Track prospective clients, manage enquiries, assign follow-ups,
              and monitor opportunities from first contact to conversion.
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
            {showForm ? 'Cancel' : '+ Add lead'}
          </button>
        </header>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Frontend prototype:</strong> Lead records and status changes
          are temporary and are not saved to PostgreSQL yet.
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
              Create lead
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Record the enquiry and assign responsibility for follow-up.
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Contact name *">
                  <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Full name" className={inputClass} />
                </Field>
                <Field label="Company *">
                  <input required value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company name" className={inputClass} />
                </Field>
                <Field label="Email">
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contact@company.com" className={inputClass} />
                </Field>
                <Field label="Phone">
                  <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+971 ..." className={inputClass} />
                </Field>
                <Field label="Lead source">
                  <select value={source} onChange={(event) => setSource(event.target.value)} className={inputClass}>
                    <option>Referral</option>
                    <option>Website</option>
                    <option>Walk-in</option>
                    <option>Social media</option>
                    <option>Phone enquiry</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select value={status} onChange={(event) => setStatus(event.target.value as LeadStatus)} className={inputClass}>
                    <option>New</option>
                    <option>Contacted</option>
                    <option>Qualified</option>
                    <option>Won</option>
                    <option>Lost</option>
                  </select>
                </Field>
                <Field label="Assigned employee">
                  <input value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} placeholder="Employee name" className={inputClass} />
                </Field>
                <Field label="Next follow-up">
                  <input type="date" value={nextFollowUp} onChange={(event) => setNextFollowUp(event.target.value)} className={inputClass} />
                </Field>
                <div className="sm:col-span-2 lg:col-span-1">
                  <Field label="Notes">
                    <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Enquiry details and next steps" className={inputClass} />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">
                  Save lead
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Open leads" value={openCount} detail="New, contacted or qualified" />
          <SummaryCard label="Follow-ups today" value={todayCount} detail="Scheduled for today" />
          <SummaryCard label="Overdue follow-ups" value={overdueCount} detail="Need attention" alert={overdueCount > 0} />
          <SummaryCard label="Converted" value={wonCount} detail="Marked as won" />
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Lead register</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search leads, review upcoming follow-ups, and update statuses.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Field label="Search">
                  <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, company, email..." className={inputClass} />
                </Field>
                <Field label="Lead status">
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}>
                    <option value="All">All statuses</option>
                    <option>New</option>
                    <option>Contacted</option>
                    <option>Qualified</option>
                    <option>Won</option>
                    <option>Lost</option>
                  </select>
                </Field>
                <Field label="Assigned employee">
                  <select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)} className={inputClass}>
                    <option value="All">All employees</option>
                    {assignees.map((assignee) => (
                      <option key={assignee} value={assignee}>{assignee}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Follow-up">
                  <select value={followUpFilter} onChange={(event) => setFollowUpFilter(event.target.value)} className={inputClass}>
                    <option value="All">All follow-ups</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Today">Today</option>
                    <option value="Upcoming">Today and upcoming</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-semibold text-slate-900">No leads found</h3>
              <p className="mt-1 text-sm text-slate-500">Change the filters or add a lead.</p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1050px] divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Contact / company', 'Contact details', 'Status', 'Assigned to', 'Next follow-up', 'Update status'].map((heading) => (
                        <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.map((lead) => {
                      const followUpLabel = getDateLabel(lead.nextFollowUp, today);

                      return (
                        <tr key={lead.id} className="align-top hover:bg-slate-50/70">
                          <td className="px-5 py-4">
                            <p className="text-sm font-semibold text-slate-900">{lead.name}</p>
                            <p className="mt-1 text-sm text-slate-500">{lead.company}</p>
                            <p className="mt-1 text-xs text-slate-400">Source: {lead.source}</p>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">
                            <p>{lead.email || 'No email'}</p>
                            <p className="mt-1">{lead.phone || 'No phone'}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[lead.status]}`}>{lead.status}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-slate-600">{lead.assignedTo || 'Unassigned'}</td>
                          <td className="px-5 py-4">
                            <p className="whitespace-nowrap text-sm text-slate-700">{formatDate(lead.nextFollowUp)}</p>
                            {followUpLabel && (
                              <p className={`mt-1 text-xs font-medium ${followUpLabel === 'Overdue' ? 'text-rose-700' : 'text-amber-700'}`}>{followUpLabel}</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <select
                              aria-label={`Update status for ${lead.name}`}
                              value={lead.status}
                              onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)}
                              className="max-w-40 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs outline-none focus:border-teal-600"
                            >
                              <option>New</option>
                              <option>Contacted</option>
                              <option>Qualified</option>
                              <option>Won</option>
                              <option>Lost</option>
                            </select>
                            <button type="button" onClick={() => setSelectedLeadId(selectedLeadId === lead.id ? null : lead.id)} className="mt-2 block text-xs font-semibold text-teal-700 hover:text-teal-900">
                              {selectedLeadId === lead.id ? 'Hide notes' : 'View notes'}
                            </button>
                            {selectedLeadId === lead.id && (
                              <p className="mt-2 max-w-xs text-xs leading-5 text-slate-600">{lead.notes || 'No notes recorded.'}</p>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-200 md:hidden">
                {filteredLeads.map((lead) => {
                  const followUpLabel = getDateLabel(lead.nextFollowUp, today);

                  return (
                    <article key={lead.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">{lead.name}</h3>
                          <p className="mt-1 text-sm text-slate-500">{lead.company}</p>
                        </div>
                        <span className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusStyles[lead.status]}`}>{lead.status}</span>
                      </div>
                      <div className="text-sm text-slate-600">
                        <p>{lead.email || 'No email'}</p>
                        <p className="mt-1">{lead.phone || 'No phone'}</p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Next follow-up</p>
                        <p className="mt-1 text-sm font-medium text-slate-800">{formatDate(lead.nextFollowUp)}</p>
                        {followUpLabel && <p className="mt-1 text-xs font-semibold text-amber-700">{followUpLabel}</p>}
                      </div>
                      <p className="text-sm text-slate-600">Assigned to: {lead.assignedTo || 'Unassigned'}</p>
                      <p className="text-sm leading-5 text-slate-500">{lead.notes || 'No notes recorded.'}</p>
                      <Field label="Update status">
                        <select value={lead.status} onChange={(event) => updateStatus(lead.id, event.target.value as LeadStatus)} className={inputClass}>
                          <option>New</option>
                          <option>Contacted</option>
                          <option>Qualified</option>
                          <option>Won</option>
                          <option>Lost</option>
                        </select>
                      </Field>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
            Showing {filteredLeads.length} of {leads.length} leads
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
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
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
      <p className={`mt-3 text-3xl font-semibold tracking-tight ${alert ? 'text-rose-700' : 'text-slate-900'}`}>{value}</p>
      <p className="mt-2 text-xs text-slate-500">{detail}</p>
    </div>
  );
}
