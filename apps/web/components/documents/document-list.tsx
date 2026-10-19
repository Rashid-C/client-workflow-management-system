"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import DocumentFormDialog from "@/components/documents/document-form-dialog";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { inputClass, primaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import {
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_STYLES,
  DOCUMENT_TYPES,
  type DocumentRecord,
  type DocumentSummary,
} from "@/lib/documents";

const iconButton = "rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900";

/**
 * The documents table. With `clientId` it is the compact list on a client's
 * page (no tiles or client column); without, the full page with filters.
 */
export default function DocumentList({ clientId, documentId }: { clientId?: number; documentId?: number }) {
  const { can } = useCurrentUser();
  const { t, day, errorText } = useI18n();
  const d = t.documents;
  const compact = clientId !== undefined;
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<DocumentRecord | "new" | null>(null);
  const [reload, setReload] = useState(0);
  const openedNotificationTarget = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (clientId) params.set("clientId", String(clientId));
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (search.trim()) params.set("search", search.trim());
    const timer = window.setTimeout(() => {
      Promise.all([
        api<DocumentRecord[]>(`/documents?${params}`, { signal: controller.signal }),
        compact ? Promise.resolve(null) : api<DocumentSummary>("/documents/summary", { signal: controller.signal }),
      ])
        .then(([list, counts]) => {
          setDocuments(list);
          setSummary(counts);
          if (!openedNotificationTarget.current && documentId) {
            const target = list.find((document) => document.id === documentId);
            if (target) {
              setEditing(target);
              openedNotificationTarget.current = true;
            }
          }
          setError("");
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return;
          setError(errorText(err, d.unableToLoad));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [clientId, status, type, search, reload, documentId]);

  async function remove(doc: DocumentRecord) {
    if (!window.confirm(d.confirmDelete(d.types[doc.type]))) return;
    try {
      await api<void>(`/documents/${doc.id}`, { method: "DELETE" });
      setReload((n) => n + 1);
    } catch (err) {
      setError(errorText(err, d.unableToDelete));
    }
  }

  const left = (doc: DocumentRecord) =>
    doc.daysLeft === null ? null : doc.daysLeft < 0 ? d.daysAgo(-doc.daysLeft) : d.daysLeft(doc.daysLeft);

  const tiles = summary && [
    { status: "Expired", label: d.expired, value: summary.Expired, tone: "text-red-700" },
    { status: "Expiring soon", label: d.expiringSoon, value: summary["Expiring soon"], tone: "text-amber-700" },
    { status: "Valid", label: d.valid, value: summary.Valid, tone: "text-emerald-700" },
    { status: "No expiry", label: d.noExpiry, value: summary["No expiry"], tone: "text-slate-700" },
  ];

  return (
    <div className="space-y-4">
      {tiles && (
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {tiles.map((tile) => (
            <button
              key={tile.status}
              type="button"
              onClick={() => setStatus((current) => (current === tile.status ? "" : tile.status))}
              aria-pressed={status === tile.status}
              className={`rounded-xl border bg-white p-4 text-start transition hover:border-brand-300 ${status === tile.status ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"}`}
            >
              <p className="text-sm text-slate-500">{tile.label}</p>
              <p className={`mt-2 text-3xl font-semibold tracking-tight ${tile.tone}`}>{tile.value}</p>
            </button>
          ))}
        </section>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        {!compact && (
          <>
            <div className="flex-1">
              <label htmlFor="doc-search" className="text-sm font-medium">{t.common.search}</label>
              <input id="doc-search" type="search" value={search} onChange={(ev) => setSearch(ev.target.value)} placeholder={d.searchPlaceholder} className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div>
                <label htmlFor="doc-status" className="text-sm font-medium">{d.status}</label>
                <select id="doc-status" value={status} onChange={(ev) => setStatus(ev.target.value)} className={inputClass}>
                  <option value="">{d.allStatuses}</option>
                  {DOCUMENT_STATUSES.map((value) => <option key={value} value={value}>{d.statuses[value]}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="doc-type-filter" className="text-sm font-medium">{d.type}</label>
                <select id="doc-type-filter" value={type} onChange={(ev) => setType(ev.target.value)} className={inputClass}>
                  <option value="">{d.allTypes}</option>
                  {DOCUMENT_TYPES.map((value) => <option key={value} value={value}>{d.types[value]}</option>)}
                </select>
              </div>
            </div>
          </>
        )}
        {can("documents.create") && (
          <button type="button" onClick={() => setEditing("new")} className={`${primaryButton} inline-flex items-center justify-center gap-1.5 ${compact ? "ms-auto" : ""}`}>
            <Plus size={16} aria-hidden="true" /> {d.add}
          </button>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      {loading ? (
        <p role="status" className="py-6 text-sm text-slate-500">{d.loading}</p>
      ) : documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
          {compact ? d.noneForClient : d.none}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className={`w-full border-collapse text-sm ${compact ? "" : "min-w-[760px]"}`}>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2.5 text-start font-medium">{d.document}</th>
                {!compact && <th className="px-3 py-2.5 text-start font-medium">{d.client}</th>}
                <th className="px-3 py-2.5 text-start font-medium">{d.expiryDate}</th>
                <th className="px-3 py-2.5 text-start font-medium">{d.status}</th>
                <th className="px-3 py-2.5"><span className="sr-only">{t.common.edit}</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-slate-900">{d.types[doc.type]}</p>
                    <p className="text-xs text-slate-500">
                      {doc.title}
                      {doc.title && doc.documentNumber && " · "}
                      {doc.documentNumber && <span dir="ltr">{doc.documentNumber}</span>}
                    </p>
                  </td>
                  {!compact && (
                    <td className="px-3 py-2.5">
                      <Link href={`/clients/${doc.client.id}`} className="text-slate-800 hover:text-brand-700 hover:underline">{doc.client.name}</Link>
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-slate-700">
                    {doc.expiryDate ? day(doc.expiryDate) : t.common.none}
                    {left(doc) && <p className={`text-xs ${doc.status === "Expired" ? "text-red-700" : doc.status === "Expiring soon" ? "text-amber-700" : "text-slate-500"}`}>{left(doc)}</p>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${DOCUMENT_STATUS_STYLES[doc.status]}`}>{d.statuses[doc.status]}</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-end">
                    {can("documents.edit") && (
                      <button type="button" onClick={() => setEditing(doc)} aria-label={`${t.common.edit} ${d.types[doc.type]}`} className={iconButton}>
                        <Pencil size={15} aria-hidden="true" />
                      </button>
                    )}
                    {can("documents.delete") && (
                      <button type="button" onClick={() => void remove(doc)} aria-label={`${d.remove} ${d.types[doc.type]}`} className={iconButton}>
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <DocumentFormDialog
          document={editing === "new" ? undefined : editing}
          clientId={clientId}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
