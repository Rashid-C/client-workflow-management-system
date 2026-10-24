"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Archive, ArchiveRestore, Pencil } from "lucide-react";
import EntityHistory from "@/components/audit/entity-history";
import { useCurrentUser } from "@/components/auth/current-user";
import ClientFormDialog from "@/components/clients/client-form-dialog";
import DocumentList from "@/components/documents/document-list";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import { monthName, type ClientDetail } from "@/lib/clients";
import { intlLocale } from "@/lib/i18n/config";
import { isOverdue, STATUS_STYLES, taskRef, type TaskListItem } from "@/lib/tasks";
import { DetailHeader, Page } from "@/components/ui/page";
import { buttonClass, labelClass } from "@/components/ui/styles";
import Badge from "@/components/ui/badge";

export default function ClientView({ clientId }: { clientId: number }) {
  const { can } = useCurrentUser();
  const { t, locale, day, dateTime, status, errorText } = useI18n();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [tasks, setTasks] = useState<TaskListItem[] | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api<ClientDetail>(`/clients/${clientId}`, { signal: controller.signal })
      .then(setClient)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiError && err.status === 404 ? t.clients.notFound : errorText(err, t.clients.unableToLoadOne));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [clientId]);

  const canSeeTasks = can("tasks.view");
  useEffect(() => {
    if (!canSeeTasks) return;
    const controller = new AbortController();
    api<{ items: TaskListItem[] }>(`/tasks?clientId=${clientId}`, { signal: controller.signal })
      .then((page) => setTasks(page.items))
      .catch(() => setTasks([]));
    return () => controller.abort();
  }, [clientId, canSeeTasks]);

  function updated(next: ClientDetail) {
    setClient(next);
    setEditing(false);
    setArchiving(false);
    setHistoryKey((key) => key + 1);
  }

  if (error) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <Link href="/clients" className="mt-3 inline-block text-sm text-brand-700 hover:underline">{t.clients.backToClients}</Link>
      </div>
    );
  }
  if (!client) return <p role="status" className="p-6 text-sm text-slate-500">{t.clients.loadingClient}</p>;

  const f = t.clients.fields;
  const none = <span className="text-slate-400">{t.common.none}</span>;
  const ltr = (value: string | null) => (value ? <span dir="ltr">{value}</span> : none);
  const plain = (value: string | null) => value ?? none;

  return (
    <Page className="space-y-6">
      <DetailHeader
        backHref="/clients"
        backLabel={t.clients.backToClients}
        meta={<>
          <span className="text-slate-400" dir="ltr">{client.clientCode}</span>
          <Badge tone={client.isActive ? "success" : "neutral"}>{client.isActive ? t.clients.active : t.clients.archived}</Badge>
        </>}
        title={client.name}
        subtitle={(client.companyName || client.legalNameAr) && <>
          {client.companyName}
          {client.companyName && client.legalNameAr && " · "}
          {client.legalNameAr && <span dir="rtl">{client.legalNameAr}</span>}
        </>}
        actions={<>
          {client.isActive && can("clients.edit") && (
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}>
              <Pencil size={14} aria-hidden="true" /> {t.common.edit}
            </button>
          )}
          {can("clients.delete") && (
            <button type="button" onClick={() => setArchiving(true)} className={buttonClass("secondary", "sm")}>
              {client.isActive ? <Archive size={14} aria-hidden="true" /> : <ArchiveRestore size={14} aria-hidden="true" />}
              {client.isActive ? t.clients.archive : t.clients.restore}
            </button>
          )}
        </>}
      />

      {!client.isActive && (
        <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{t.clients.archivedNotice}</p>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={t.clients.sections.company}>
          <Fact label={f.entityType}>{client.entityType ? t.clients.entityTypes[client.entityType] : none}</Fact>
          <Fact label={f.jurisdiction}>
            {client.jurisdiction ? t.clients.jurisdictions[client.jurisdiction] : none}
            {client.freeZone && <span className="text-slate-500"> · {client.freeZone}</span>}
          </Fact>
          <Fact label={f.emirate}>{client.emirate ? t.clients.emirates[client.emirate] : none}</Fact>
          <Fact label={f.tradeLicenseNumber}>{ltr(client.tradeLicenseNumber)}</Fact>
          <Fact label={f.licenseAuthority}>{plain(client.licenseAuthority)}</Fact>
          <Fact label={f.businessActivity}>{plain(client.businessActivity)}</Fact>
        </Card>

        <Card title={t.clients.sections.tax}>
          <Fact label={f.vatTrn}>{ltr(client.vatTrn)}</Fact>
          <Fact label={f.corporateTaxTrn}>{ltr(client.corporateTaxTrn)}</Fact>
          <Fact label={f.financialYearEnd}>
            {client.financialYearEndMonth ? monthName(intlLocale(locale), client.financialYearEndMonth) : none}
          </Fact>
        </Card>

        <Card title={t.clients.sections.details}>
          <Fact label={f.email}>
            {client.email ? <a href={`mailto:${client.email}`} dir="ltr" className="text-brand-700 hover:underline">{client.email}</a> : none}
          </Fact>
          <Fact label={f.phone}>
            {client.phone ? <a href={`tel:${client.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="text-brand-700 hover:underline">{client.phone}</a> : none}
          </Fact>
          <Fact label={f.address}>{plain(client.address)}</Fact>
        </Card>

        <Card title={t.clients.sections.contact}>
          <Fact label={f.contactName}>
            {client.contactName ?? none}
            {client.contactDesignation && <span className="text-slate-500"> · {client.contactDesignation}</span>}
          </Fact>
          <Fact label={f.contactEmail}>
            {client.contactEmail ? <a href={`mailto:${client.contactEmail}`} dir="ltr" className="text-brand-700 hover:underline">{client.contactEmail}</a> : none}
          </Fact>
          <Fact label={f.contactPhone}>
            {client.contactPhone ? <a href={`tel:${client.contactPhone.replace(/[^\d+]/g, "")}`} dir="ltr" className="text-brand-700 hover:underline">{client.contactPhone}</a> : none}
          </Fact>
        </Card>

        <Card title={t.clients.sections.internal}>
          <Fact label={f.accountManager}>{client.accountManager?.name ?? <span className="text-slate-400">{t.clients.noManager}</span>}</Fact>
          <Fact label={t.clients.added}>{dateTime(client.createdAt)}</Fact>
          {client.notes && <p className="whitespace-pre-wrap border-t border-slate-100 pt-3 text-sm text-slate-700">{client.notes}</p>}
        </Card>

        {canSeeTasks && (
          <Card title={`${t.clients.tasks}${client.openTasks ? ` · ${t.clients.openTasks(client.openTasks)}` : ""}`}>
            {tasks === null ? (
              <p className="text-sm text-slate-500">{t.common.loading}</p>
            ) : tasks.length === 0 ? (
              <p className="text-sm text-slate-500">{t.clients.noTasks}</p>
            ) : (
              <ul className="-my-2 divide-y divide-slate-100">
                {tasks.map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-3 py-2">
                    <Link href={`/tasks/${task.id}`} className="min-w-0 text-sm hover:text-brand-700 hover:underline">
                      <span className="text-slate-400" dir="ltr">{taskRef(task.id)}</span> {task.title}
                      {task.dueDate && (
                        <span className={`ms-2 text-xs ${isOverdue(task) ? "font-semibold text-red-700" : "text-slate-500"}`}>{day(task.dueDate)}</span>
                      )}
                    </Link>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>{status(task.status)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      {can("documents.view") && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <DocumentList clientId={client.id} title={t.documents.title} />
        </section>
      )}

      {can("history.view") && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <EntityHistory key={historyKey} entityType="Client" entityId={String(client.id)} />
        </section>
      )}

      {editing && <ClientFormDialog client={client} onClose={() => setEditing(false)} onSaved={updated} />}
      {archiving && <ArchiveDialog client={client} onClose={() => setArchiving(false)} onDone={updated} />}
    </Page>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-slate-900">{children}</dd>
    </div>
  );
}

/** Archive or restore, with an optional reason for the history. */
function ArchiveDialog({
  client,
  onClose,
  onDone,
}: {
  client: ClientDetail;
  onClose: () => void;
  onDone: (client: ClientDetail) => void;
}) {
  const { t, errorText } = useI18n();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const archiving = client.isActive;

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      onDone(
        await api<ClientDetail>(`/clients/${client.id}/${archiving ? "archive" : "restore"}`, {
          method: "POST",
          body: JSON.stringify({ reason }),
        }),
      );
    } catch (err) {
      setError(errorText(err, t.clients.unableToUpdate));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={archiving ? t.clients.archiveTitle(client.name) : t.clients.restoreTitle(client.name)}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>{t.common.cancel}</button>
          <button type="button" onClick={() => void confirm()} disabled={busy} className={primaryButton}>
            {archiving ? t.clients.archive : t.clients.restore}
          </button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{archiving ? t.clients.archiveHint : t.clients.restoreHint}</p>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="client-archive-reason" className={labelClass}>{t.clients.reason}</label>
        <textarea
          id="client-archive-reason"
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className={inputClass}
        />
      </div>
    </Modal>
  );
}
