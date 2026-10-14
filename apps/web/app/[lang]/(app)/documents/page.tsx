'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';

type DocumentStatus = 'Valid' | 'Expiring soon' | 'Expired';

type ClientDocument = {
  id: number;
  client: string;
  documentName: string;
  documentType: string;
  reference: string;
  issueDate: string;
  expiryDate: string;
  responsible: string;
  notes: string;
};

const initialDocuments: ClientDocument[] = [
  {
    id: 1,
    client: 'Al Noor Trading LLC',
    documentName: 'Trade License',
    documentType: 'Trade License',
    reference: 'DOC-1001',
    issueDate: '2025-11-01',
    expiryDate: '2026-10-20',
    responsible: 'Arun Kumar',
    notes: 'Renewal documents need to be collected.',
  },
  {
    id: 2,
    client: 'Bluewave Services LLC',
    documentName: 'VAT Certificate',
    documentType: 'Tax Certificate',
    reference: 'DOC-1002',
    issueDate: '2025-08-15',
    expiryDate: '2027-08-15',
    responsible: 'Fathima Shirin',
    notes: 'Verify the certificate details during the next review.',
  },
  {
    id: 3,
    client: 'Crescent General Trading',
    documentName: 'Emirates ID Copy',
    documentType: 'Identification',
    reference: 'DOC-1003',
    issueDate: '2024-10-01',
    expiryDate: '2026-09-30',
    responsible: 'Rahul Das',
    notes: 'Updated copy required from the client.',
  },
  {
    id: 4,
    client: 'Al Noor Trading LLC',
    documentName: 'Audit Engagement Letter',
    documentType: 'Engagement Letter',
    reference: 'DOC-1004',
    issueDate: '2026-01-01',
    expiryDate: '2027-01-01',
    responsible: 'Arun Kumar',
    notes: 'Retain the signed copy in the client record.',
  },
  {
    id: 5,
    client: 'Bluewave Services LLC',
    documentName: 'Trade License',
    documentType: 'Trade License',
    reference: 'DOC-1005',
    issueDate: '2025-10-01',
    expiryDate: '2026-10-15',
    responsible: 'Fathima Shirin',
    notes: 'Follow up with the client regarding renewal.',
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

// The local date only exists in the browser. Reading it through
// useSyncExternalStore renders null on the server and the real date on the
// client, avoiding a hydration mismatch without setState in an effect.
const subscribeToToday = () => () => {};

function getLocalToday() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function getStatus(expiryDate: string, today: string | null): DocumentStatus | null {
  if (!today) return null;

  const expiry = Date.parse(`${expiryDate}T00:00:00Z`);
  const current = Date.parse(`${today}T00:00:00Z`);
  const daysRemaining = Math.round((expiry - current) / DAY_MS);

  if (daysRemaining < 0) return 'Expired';
  if (daysRemaining <= 30) return 'Expiring soon';
  return 'Valid';
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const statusStyles: Record<DocumentStatus, string> = {
  Valid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  'Expiring soon': 'bg-amber-50 text-amber-800 ring-amber-600/20',
  Expired: 'bg-rose-50 text-rose-700 ring-rose-600/20',
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState(initialDocuments);
  const today = useSyncExternalStore(subscribeToToday, getLocalToday, () => null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState('');

  const [client, setClient] = useState('');
  const [documentName, setDocumentName] = useState('');
  const [documentType, setDocumentType] = useState('Trade License');
  const [reference, setReference] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [responsible, setResponsible] = useState('');
  const [notes, setNotes] = useState('');

  const documentTypes = useMemo(
    () => [...new Set(documents.map((document) => document.documentType))].sort(),
    [documents],
  );

  const enrichedDocuments = useMemo(
    () =>
      documents.map((document) => ({
        ...document,
        status: getStatus(document.expiryDate, today),
      })),
    [documents, today],
  );

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLowerCase();

    return enrichedDocuments.filter((document) => {
      const matchesSearch =
        !query ||
        [
          document.client,
          document.documentName,
          document.documentType,
          document.reference,
          document.responsible,
        ].some((value) => value.toLowerCase().includes(query));

      const matchesStatus =
        statusFilter === 'All' || document.status === statusFilter;

      const matchesType =
        typeFilter === 'All' || document.documentType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [enrichedDocuments, search, statusFilter, typeFilter]);

  const expiredCount = enrichedDocuments.filter(
    (document) => document.status === 'Expired',
  ).length;

  const expiringCount = enrichedDocuments.filter(
    (document) => document.status === 'Expiring soon',
  ).length;

  const validCount = enrichedDocuments.filter(
    (document) => document.status === 'Valid',
  ).length;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!client.trim() || !documentName.trim() || !expiryDate) {
      setMessage('Please enter the client, document name and expiry date.');
      return;
    }

    if (issueDate && expiryDate < issueDate) {
      setMessage('Expiry date cannot be earlier than the issue date.');
      return;
    }

    const newDocument: ClientDocument = {
      id: Date.now(),
      client: client.trim(),
      documentName: documentName.trim(),
      documentType,
      reference: reference.trim() || `DOC-${Date.now().toString().slice(-6)}`,
      issueDate,
      expiryDate,
      responsible: responsible.trim() || 'Unassigned',
      notes: notes.trim() || 'No additional notes.',
    };

    setDocuments((current) => [newDocument, ...current]);
    setSearch('');
    setStatusFilter('All');
    setTypeFilter('All');
    setClient('');
    setDocumentName('');
    setDocumentType('Trade License');
    setReference('');
    setIssueDate('');
    setExpiryDate('');
    setResponsible('');
    setNotes('');
    setMessage('Document record added successfully.');
    setShowForm(false);
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-700">
              Client records
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              Documents &amp; Expiry
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Keep client documents organised and identify expired or
              approaching expiry dates before they become a problem.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setShowForm((current) => !current);
              setMessage('');
            }}
            className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
          >
            {showForm ? 'Cancel' : '+ Add document'}
          </button>
        </header>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong>Frontend prototype:</strong> Records use sample data and
          browser memory. Document files are not uploaded, and records are not
          saved to the database yet.
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
                Add client document
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a document record and assign responsibility for follow-up.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="Client name *">
                  <input
                    required
                    value={client}
                    onChange={(event) => setClient(event.target.value)}
                    placeholder="Enter client name"
                    className={inputClass}
                  />
                </Field>

                <Field label="Document name *">
                  <input
                    required
                    value={documentName}
                    onChange={(event) => setDocumentName(event.target.value)}
                    placeholder="e.g. Trade License"
                    className={inputClass}
                  />
                </Field>

                <Field label="Document type">
                  <select
                    value={documentType}
                    onChange={(event) => setDocumentType(event.target.value)}
                    className={inputClass}
                  >
                    <option>Trade License</option>
                    <option>Tax Certificate</option>
                    <option>Identification</option>
                    <option>Engagement Letter</option>
                    <option>Bank Statement</option>
                    <option>Contract</option>
                    <option>Other</option>
                  </select>
                </Field>

                <Field label="Reference number">
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    placeholder="Optional document reference"
                    className={inputClass}
                  />
                </Field>

                <Field label="Issue date">
                  <input
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    max={expiryDate || undefined}
                    className={inputClass}
                  />
                </Field>

                <Field label="Expiry date *">
                  <input
                    required
                    type="date"
                    value={expiryDate}
                    onChange={(event) => setExpiryDate(event.target.value)}
                    min={issueDate || undefined}
                    className={inputClass}
                  />
                </Field>

                <Field label="Responsible employee">
                  <input
                    value={responsible}
                    onChange={(event) => setResponsible(event.target.value)}
                    placeholder="Employee name"
                    className={inputClass}
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Field label="Notes">
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Renewal details or follow-up notes"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2"
                >
                  Save document record
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Total documents" value={documents.length} detail="All recorded documents" />
          <SummaryCard label="Valid" value={validCount} detail="More than 30 days remaining" />
          <SummaryCard label="Expiring soon" value={expiringCount} detail="Expires within 30 days" alert={expiringCount > 0} />
          <SummaryCard label="Expired" value={expiredCount} detail="Requires renewal follow-up" alert={expiredCount > 0} />
        </section>

        {(expiredCount > 0 || expiringCount > 0) && (
          <section className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Renewal attention required
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {expiredCount > 0 &&
                `${expiredCount} document${expiredCount === 1 ? '' : 's'} expired. `}
              {expiringCount > 0 &&
                `${expiringCount} document${expiringCount === 1 ? '' : 's'} expiring within 30 days. `}
              Review the records below and follow up with the responsible employee.
            </p>
            <button
              type="button"
              onClick={() => {
                setStatusFilter(expiredCount > 0 ? 'Expired' : 'Expiring soon');
                setTypeFilter('All');
              }}
              className="mt-3 text-sm font-semibold text-rose-700 hover:text-rose-900"
            >
              View {expiredCount > 0 ? 'expired' : 'expiring'} documents →
            </button>
          </section>
        )}

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Document register
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Search client records and monitor expiry status.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field label="Search">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Client, document, reference..."
                    className={inputClass}
                  />
                </Field>

                <Field label="Expiry status">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All statuses</option>
                    <option value="Valid">Valid</option>
                    <option value="Expiring soon">Expiring soon</option>
                    <option value="Expired">Expired</option>
                  </select>
                </Field>

                <Field label="Document type">
                  <select
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All document types</option>
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          {filteredDocuments.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <h3 className="text-sm font-semibold text-slate-900">
                No documents found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try changing the filters or add a document record.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[1000px] divide-y divide-slate-200 text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {[
                        'Client / document',
                        'Reference',
                        'Issue date',
                        'Expiry date',
                        'Responsible',
                        'Status',
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
                    {filteredDocuments.map((document) => (
                      <tr key={document.id} className="align-top hover:bg-slate-50/70">
                        <td className="px-5 py-4">
                          <p className="text-sm font-semibold text-slate-900">
                            {document.client}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {document.documentName}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {document.documentType}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {document.reference}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm text-slate-600">
                          {document.issueDate ? formatDate(document.issueDate) : '—'}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-slate-800">
                          {formatDate(document.expiryDate)}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {document.responsible}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={document.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-slate-200 md:hidden">
                {filteredDocuments.map((document) => {
                  return (
                    <article key={document.id} className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {document.client}
                          </h3>
                          <p className="mt-1 text-sm text-slate-600">
                            {document.documentName}
                          </p>
                        </div>
                        <StatusBadge status={document.status} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-slate-500">Expiry date</p>
                          <p className="mt-1 font-medium text-slate-800">
                            {formatDate(document.expiryDate)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Responsible</p>
                          <p className="mt-1 font-medium text-slate-800">
                            {document.responsible}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500">
                        Ref: {document.reference}
                      </p>
                      <p className="text-sm leading-5 text-slate-600">
                        {document.notes}
                      </p>
                    </article>
                  );
                })}
              </div>
            </>
          )}

          <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500 sm:px-5">
            Showing {filteredDocuments.length} of {documents.length} records
          </div>
        </section>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

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

function StatusBadge({ status }: { status: DocumentStatus | null }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        status ? statusStyles[status] : 'bg-slate-50 text-slate-400 ring-slate-300/40'
      }`}
    >
      {status ?? '—'}
    </span>
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
