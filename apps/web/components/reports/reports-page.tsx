"use client";

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import { api, apiBlob } from "@/lib/api";
import { inputClass, primaryButton } from "@/components/ui/modal";
import { cardClass } from "@/components/ui/card";
import { Page, PageHeader } from "@/components/ui/page";
import StatCard from "@/components/ui/stat-card";
import { secondaryButton } from "@/components/ui/styles";

const REPORTS = ["time-by-employee", "time-by-client", "task-status", "expiring-documents", "leads-pipeline"] as const;
type Report = (typeof REPORTS)[number];
type Row = Record<string, string | number | null>;
type ReportData = {
  from?: string;
  to?: string;
  days?: number;
  rows?: Row[];
  byStatusAndType?: Row[];
  overdue?: Row[];
  pipeline?: Row[];
  closedValueByStatus?: Row[];
  totalMinutes?: number;
  closedInPeriod?: { won: number; lost: number; conversionRate: number };
};
type Column = { key: string; label: string; render?: (row: Row) => string | number };
type Choice = { id: number; name: string; clientCode?: string };
type FilterChoices = { clients: Choice[]; employees: Choice[]; taskTypes: Choice[] };

export default function ReportsPage() {
  const { t, locale, day, errorText } = useI18n();
  const { can } = useCurrentUser();
  const r = t.reports;
  const [report, setReport] = useState<Report>(REPORTS[0]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [clientId, setClientId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [taskTypeId, setTaskTypeId] = useState("");
  const [days, setDays] = useState("30");
  const [status, setStatus] = useState("");
  const [requestKey, setRequestKey] = useState("");
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [choices, setChoices] = useState<FilterChoices>({ clients: [], employees: [], taskTypes: [] });

  useEffect(() => {
    api<FilterChoices>("/reports/filters").then(setChoices).catch(() => {});
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      api<ReportData>(`/reports/${report}?${requestKey}`, { signal: controller.signal })
        .then((result) => {
          setData(result);
          setFrom((current) => current || result.from || "");
          setTo((current) => current || result.to || "");
          setError("");
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(errorText(err, r.unableToLoad));
        })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [report, requestKey, errorText, r.unableToLoad]);

  const statusOptions = useMemo(() => {
    const keys = report === "task-status"
      ? ["Pending", "In progress", "Completed", "Blocked"]
      : ["New", "Contacted", "Proposal sent", "Won", "Lost"];
    return keys.map((key) => [key, r.reportStatuses[key as keyof typeof r.reportStatuses]] as const);
  }, [report, r]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (report !== "expiring-documents") {
      params.set("from", from);
      params.set("to", to);
    } else {
      params.set("days", days || "30");
    }
    if (clientId) params.set("clientId", clientId);
    if (employeeId && report.startsWith("time-by-")) params.set("employeeId", employeeId);
    if (taskTypeId && ["time-by-client", "time-by-employee", "task-status"].includes(report)) params.set("taskTypeId", taskTypeId);
    if (status && ["task-status", "leads-pipeline"].includes(report)) params.set("status", status);
    setLoading(true);
    setRequestKey(params.toString());
  }

  function selectReport(next: Report) {
    setReport(next);
    setData(null);
    setError("");
    setStatus("");
    setLoading(true);
    const params = new URLSearchParams();
    if (next === "expiring-documents") params.set("days", days || "30");
    else {
      if (from) params.set("from", from);
      if (to) params.set("to", to);
    }
    if (clientId && next !== "leads-pipeline") params.set("clientId", clientId);
    if (employeeId && next.startsWith("time-by-")) params.set("employeeId", employeeId);
    if (taskTypeId && ["time-by-client", "time-by-employee", "task-status"].includes(next)) params.set("taskTypeId", taskTypeId);
    setRequestKey(params.toString());
  }

  async function exportReport() {
    setExporting(true);
    try {
      const params = new URLSearchParams(requestKey);
      params.set("lang", locale);
      const file = await apiBlob(`/reports/${report}.xlsx?${params}`);
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `tickwise-${report}.xlsx`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(errorText(err, r.unableToExport));
    } finally {
      setExporting(false);
    }
  }

  const columnsFor = (keys: string[]): Column[] => keys.map((key) => ({
    key,
    label: columnLabel(key, r),
    render: (row) => key === "hours" && typeof row.minutes === "number"
      ? (row.minutes / 60).toFixed(2)
      : renderValue(key, row[key], r.reportStatuses, locale, day),
  }));

  function table(title: string, rows: Row[], columns: Column[]) {
    return (
      <section key={title} className={`overflow-hidden ${cardClass}`}>
        <h2 className="border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">{title}</h2>
        {rows.length === 0 ? <p className="px-4 py-5 text-sm text-slate-500">{r.empty}</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>{columns.map((column) => <th key={column.key} scope="col" className="px-4 py-3 text-start">{column.label}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, index) => <tr key={String(row.id ?? `${index}-${row[columns[0]?.key] ?? "row"}`)}>
                  {columns.map((column) => <td key={column.key} className="px-4 py-3 text-slate-700">{column.render?.(row) ?? "—"}</td>)}
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const sections = useMemo(() => {
    if (!data) return [];
    switch (report) {
      case "time-by-employee": return [{ title: r.reportNames[report], rows: data.rows ?? [], columns: columnsFor(["employee", "client", "hours"]) }];
      case "time-by-client": return [{ title: r.reportNames[report], rows: data.rows ?? [], columns: columnsFor(["client", "taskType", "hours"]) }];
      case "task-status": return [
        { title: r.title + " · " + r.status, rows: data.byStatusAndType ?? [], columns: columnsFor(["status", "taskType", "count"]) },
        { title: r.overdueTasks, rows: data.overdue ?? [], columns: columnsFor(["taskId", "task", "client", "taskType", "status", "dueDate"]) },
      ];
      case "expiring-documents": return [{ title: r.reportNames[report], rows: data.rows ?? [], columns: columnsFor(["client", "documentType", "documentNumber", "expiryDate", "daysLeft"]) }];
      case "leads-pipeline": return [
        { title: r.reportNames[report], rows: data.pipeline ?? [], columns: columnsFor(["status", "count", "value"]) },
        { title: r.closedInPeriod, rows: data.closedValueByStatus ?? [], columns: columnsFor(["status", "count", "value"]) },
      ];
    }
  // Labels change with locale while the fetched rows do not.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, report, locale, r]);

  return (
    <Page>
      <PageHeader eyebrow={r.eyebrow} title={r.title} subtitle={r.subtitle} />

      <form onSubmit={submit} className={`mb-6 grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4 ${cardClass}`}>
        <Field label={r.report}><select value={report} onChange={(event) => selectReport(event.target.value as Report)} className={inputClass}>
          {REPORTS.map((name) => <option key={name} value={name}>{r.reportNames[name]}</option>)}
        </select></Field>
        {report !== "expiring-documents" ? <>
          <Field label={r.from}><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={inputClass} required /></Field>
          <Field label={r.to}><input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={inputClass} required /></Field>
        </> : <Field label={r.days}><input type="number" min="1" max="365" value={days} onChange={(event) => setDays(event.target.value)} className={inputClass} /></Field>}
        {report !== "leads-pipeline" && <Field label={r.clientFilter}><select value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}>
          <option value="">{r.allClients}</option>
          {choices.clients.map((client) => <option key={client.id} value={client.id}>{client.name} ({client.clientCode})</option>)}
        </select></Field>}
        {report.startsWith("time-by-") && choices.employees.length > 0 && <Field label={r.employeeFilter}><select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} className={inputClass}>
          <option value="">{r.allEmployees}</option>
          {choices.employees.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}
        </select></Field>}
        {["time-by-client", "time-by-employee", "task-status"].includes(report) && <Field label={r.taskTypeFilter}><select value={taskTypeId} onChange={(event) => setTaskTypeId(event.target.value)} className={inputClass}>
          <option value="">{r.allTaskTypes}</option>
          {choices.taskTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select></Field>}
        {["task-status", "leads-pipeline"].includes(report) && <Field label={r.status}><select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
          <option value="">{r.allStatuses}</option>{statusOptions.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select></Field>}
        <div className="flex items-end gap-2 lg:col-span-2">
          <button type="submit" className={primaryButton}>{loading && <LoaderCircle size={16} className="animate-spin" />}{r.run}</button>
          {can("reports.export") && <button type="button" disabled={exporting} onClick={exportReport} className={secondaryButton}>
            {exporting ? <LoaderCircle size={16} className="animate-spin" /> : <Download size={16} />}{r.export}
          </button>}
        </div>
      </form>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>}
      {data?.from && data?.to && <p className="mb-4 text-xs text-slate-500">{r.period}: {day(data.from)} – {day(data.to)}</p>}
      {report === "leads-pipeline" && data?.closedInPeriod && <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard compact label={r.won} value={data.closedInPeriod.won} tone="success" />
        <StatCard compact label={r.lost} value={data.closedInPeriod.lost} />
        <StatCard compact label={r.conversionRate} value={`${data.closedInPeriod.conversionRate.toFixed(2)}%`} tone="brand" />
      </div>}
      {report.startsWith("time-by-") && data && <p className="mb-4 text-sm font-medium text-slate-700">{r.totals}: {((data.totalMinutes ?? 0) / 60).toFixed(2)} {r.hours.toLowerCase()}</p>}
      {loading && !data ? <p className="py-10 text-center text-sm text-slate-500">{r.loading}</p> : <div className="space-y-5">{sections.map((section) => table(section.title, section.rows, section.columns))}</div>}
    </Page>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-1.5 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>;
}


function columnLabel(key: string, r: ReturnType<typeof useI18n>["t"]["reports"]) {
  const labels: Record<string, string> = {
    employee: r.employee, client: r.client, taskType: r.taskType, hours: r.hours, minutes: r.minutes,
    status: r.statusColumn, count: r.count, value: r.value, taskId: r.taskId, task: r.task,
    dueDate: r.dueDate, documentType: r.documentType, documentNumber: r.documentNumber,
    expiryDate: r.expiryDate, daysLeft: r.daysLeft,
  };
  return labels[key] ?? key;
}

function renderValue(key: string, value: Row[string], statuses: Record<string, string>, locale: string, day: (value: string) => string) {
  if (value === null || value === undefined) return "—";
  if (["workDate", "dueDate", "expiryDate"].includes(key) && typeof value === "string") return day(value);
  if (key === "minutes" && typeof value === "number") return (value / 60).toFixed(2);
  if (key === "status") return statuses[String(value)] ?? value;
  if (key === "value" && typeof value === "number") return new Intl.NumberFormat(locale, { style: "currency", currency: "AED", maximumFractionDigits: 2 }).format(value);
  if (typeof value === "number") return new Intl.NumberFormat(locale).format(value);
  return value;
}
