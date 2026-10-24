"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import ClientFormDialog from "@/components/clients/client-form-dialog";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link, { useRouter } from "@/components/i18n/link";
import { inputClass, primaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { EMIRATES, type ClientSummary } from "@/lib/clients";
import { labelClass } from "@/components/ui/styles";
import { cardClass } from "@/components/ui/card";

type StatusFilter = "active" | "archived" | "all";

export default function ClientList() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const { t, errorText } = useI18n();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [emirate, setEmirate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api<ClientSummary[]>("/clients", { signal: controller.signal })
      .then(setClients)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(errorText(err, t.clients.unableToLoad));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; t is stable per language
  }, []);

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    // A TRN may be searched with spaces, as printed on certificates.
    const digits = query.replace(/[\s-]/g, "");
    return clients.filter((client) => {
      if (status === "active" && !client.isActive) return false;
      if (status === "archived" && client.isActive) return false;
      if (emirate && client.emirate !== emirate) return false;
      if (!query) return true;
      return (
        [client.name, client.clientCode, client.companyName, client.email, client.phone].some(
          (value) => value?.toLowerCase().includes(query),
        ) || Boolean(digits && client.vatTrn?.includes(digits))
      );
    });
  }, [clients, search, status, emirate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="flex-1">
          <label htmlFor="client-search" className={labelClass}>{t.clients.searchLabel}</label>
          <input
            id="client-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t.clients.searchPlaceholder}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <div>
            <label htmlFor="client-status" className={labelClass}>{t.clients.statusFilter}</label>
            <select id="client-status" value={status} onChange={(event) => setStatus(event.target.value as StatusFilter)} className={inputClass}>
              <option value="active">{t.clients.active}</option>
              <option value="archived">{t.clients.archived}</option>
              <option value="all">{t.clients.statusAll}</option>
            </select>
          </div>
          <div>
            <label htmlFor="client-emirate" className={labelClass}>{t.clients.emirateFilter}</label>
            <select id="client-emirate" value={emirate} onChange={(event) => setEmirate(event.target.value)} className={inputClass}>
              <option value="">{t.clients.anyEmirate}</option>
              {EMIRATES.map((value) => (
                <option key={value} value={value}>{t.clients.emirates[value]}</option>
              ))}
            </select>
          </div>
        </div>
        {can("clients.create") && (
          <button type="button" onClick={() => setCreating(true)} className={`${primaryButton} inline-flex items-center justify-center gap-1.5`}>
            <Plus size={16} aria-hidden="true" /> {t.clients.newClient}
          </button>
        )}
      </div>

      {error ? (
        <p role="alert" className="py-4 text-sm text-red-700">{error}</p>
      ) : loading ? (
        <p role="status" className="py-8 text-sm text-slate-500">{t.clients.loading}</p>
      ) : (
        <>
          <div className={`overflow-x-auto ${cardClass}`}>
            <table className="w-full min-w-190 border-collapse text-start text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-start font-medium">{t.clients.client}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.clients.company}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.clients.fields.emirate}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.clients.accountManager}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.clients.tasks}</th>
                  <th className="px-4 py-3 text-start font-medium">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {shown.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/clients/${client.id}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {client.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500" dir="ltr">{client.clientCode}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {client.companyName || t.common.none}
                      {client.vatTrn && <p className="mt-0.5 text-xs text-slate-500" dir="ltr">TRN {client.vatTrn}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {client.emirate ? t.clients.emirates[client.emirate] : t.common.none}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{client.accountManager?.name ?? <span className="text-slate-400">{t.clients.noManager}</span>}</td>
                    <td className="px-4 py-3 text-slate-700">{client.openTasks ? t.clients.openTasks(client.openTasks) : t.common.none}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          client.isActive
                            ? "inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700"
                            : "inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                        }
                      >
                        {client.isActive ? t.clients.active : t.clients.archived}
                      </span>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-500">{t.clients.noneFound}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-slate-500">{t.clients.showing(shown.length, clients.length)}</p>
        </>
      )}

      {creating && (
        <ClientFormDialog
          onClose={() => setCreating(false)}
          onSaved={(client) => router.push(`/clients/${client.id}`)}
        />
      )}
    </div>
  );
}
