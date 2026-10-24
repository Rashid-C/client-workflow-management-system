"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { ClientSummary } from "@/lib/clients";
import { DOCUMENT_TYPES, type DocumentRecord, type DocumentType } from "@/lib/documents";
import { alertClass, labelClass } from "@/components/ui/styles";

/** Add a document (for `clientId` when given), or edit `document`. */
export default function DocumentFormDialog({
  document,
  clientId,
  onClose,
  onSaved,
}: {
  document?: DocumentRecord;
  clientId?: number;
  onClose: () => void;
  onSaved: (document: DocumentRecord) => void;
}) {
  const { t, errorText } = useI18n();
  const d = t.documents;
  const fixedClient = clientId ?? document?.client.id;
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [form, setForm] = useState({
    clientId: fixedClient ? String(fixedClient) : "",
    type: (document?.type ?? "Trade licence") as DocumentType,
    title: document?.title ?? "",
    documentNumber: document?.documentNumber ?? "",
    issueDate: document?.issueDate ?? "",
    expiryDate: document?.expiryDate ?? "",
    reminderDays: String(document?.reminderDays ?? 30),
    notes: document?.notes ?? "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // A new document starts from the firm's default reminder (Settings).
  useEffect(() => {
    if (document) return;
    api<{ documentReminderDays: number }>("/settings")
      .then((settings) =>
        setForm((current) => ({ ...current, reminderDays: String(settings.documentReminderDays) })),
      )
      .catch(() => {});
  }, [document]);

  useEffect(() => {
    if (fixedClient) return;
    api<ClientSummary[]>("/clients")
      .then((list) => setClients(list.filter((client) => client.isActive)))
      .catch(() => {});
  }, [fixedClient]);

  const set = (key: keyof typeof form) => (event: { target: { value: string } }) =>
    setForm((current) => ({ ...current, [key]: event.target.value }));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!form.clientId) return setError(d.chooseClient);
    setSaving(true);
    setError("");
    const body = {
      ...form,
      clientId: Number(form.clientId),
      reminderDays: Number(form.reminderDays || 30),
      ...(document ? { version: document.version } : {}),
    };
    try {
      onSaved(
        await api<DocumentRecord>(document ? `/documents/${document.id}` : "/documents", {
          method: document ? "PATCH" : "POST",
          body: JSON.stringify(body),
        }),
      );
    } catch (err) {
      setError(errorText(err, d.unableToSave));
      setSaving(false);
    }
  }

  const field = (id: string, label: string, control: React.ReactNode, hint?: string, wide = false) => (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className={labelClass}>{label}</label>
      {control}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );

  return (
    <Modal
      wide
      title={document ? d.editTitle : d.addTitle}
      subtitle={document?.client.name}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>{t.common.cancel}</button>
          <button type="submit" form="document-form" disabled={saving} className={primaryButton}>
            {saving ? t.common.saving : t.common.save}
          </button>
        </>
      }
    >
      <form id="document-form" onSubmit={save} className="space-y-4">
        {error && <p role="alert" className={alertClass}>{error}</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {!fixedClient &&
            field("doc-client", `${d.client} *`, (
              <select id="doc-client" required value={form.clientId} onChange={set("clientId")} className={inputClass}>
                <option value="">{t.clients.choose}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name} ({client.clientCode})</option>
                ))}
              </select>
            ), undefined, true)}
          {field("doc-type", `${d.type} *`, (
            <select id="doc-type" value={form.type} onChange={set("type")} className={inputClass}>
              {DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{d.types[type]}</option>)}
            </select>
          ))}
          {field("doc-title", d.titleField, <input id="doc-title" maxLength={150} value={form.title} onChange={set("title")} className={inputClass} />, d.titleHint)}
          {field("doc-number", d.number, <input id="doc-number" dir="ltr" maxLength={60} value={form.documentNumber} onChange={set("documentNumber")} className={inputClass} />)}
          {field("doc-reminder", d.reminderDays, (
            <input id="doc-reminder" type="number" min={0} max={365} value={form.reminderDays} onChange={set("reminderDays")} className={inputClass} />
          ))}
          {field("doc-issue", d.issueDate, <input id="doc-issue" type="date" value={form.issueDate} onChange={set("issueDate")} className={inputClass} />)}
          {field("doc-expiry", d.expiryDate, <input id="doc-expiry" type="date" value={form.expiryDate} onChange={set("expiryDate")} className={inputClass} />, d.expiryHint)}
          {field("doc-notes", d.notes, <textarea id="doc-notes" rows={3} maxLength={1000} value={form.notes} onChange={set("notes")} className={inputClass} />, d.fileNote, true)}
        </div>
      </form>
    </Modal>
  );
}
