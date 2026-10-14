"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { api } from "@/lib/api";

type Client = {
  id: number;
  clientCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};


export default function ClientSearch() {
  const { t, errorText } = useI18n();
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadClients() {
      try {
        const data = await api<Client[]>("/clients", {
          signal: controller.signal,
        });
        setClients(data);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        setError(errorText(err, t.common.noJson));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadClients();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; t is stable per language
  }, []);

  const filteredClients = useMemo(() => {
    const query = search.trim().toLowerCase();

    return clients.filter((client) =>
      [
        client.name,
        client.clientCode,
        client.companyName ?? "",
        client.email ?? "",
        client.phone ?? "",
      ].some((value) => value.toLowerCase().includes(query)),
    );
  }, [clients, search]);

  if (loading) {
    return <p className="py-8 text-sm text-slate-500">{t.clients.loading}</p>;
  }

  if (error) {
    return (
      <div role="alert" className="space-y-3 py-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label
          htmlFor="client-search"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          {t.clients.searchLabel}
        </label>
        <input
          id="client-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t.clients.searchPlaceholder}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-brand-700 focus:ring-2 focus:ring-brand-700/20"
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-start text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="w-[28%] px-3 py-3 font-medium sm:px-5">
                  {t.clients.client}
                </th>
                <th className="w-[22%] px-3 py-3 font-medium sm:px-5">
                  {t.clients.company}
                </th>
                <th className="w-[22%] px-3 py-3 font-medium sm:px-5">{t.clients.email}</th>
                <th className="w-[16%] px-3 py-3 font-medium sm:px-5">{t.clients.phone}</th>
                <th className="w-[12%] px-3 py-3 font-medium sm:px-5">
                  {t.common.status}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredClients.map((client) => (
                <tr
                  key={client.id}
                  className="transition-colors hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-medium text-slate-900">{client.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {client.clientCode}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">
                    {client.companyName || "—"}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {client.email ? (
                      <a
                        href={`mailto:${client.email}`}
                        className="hover:text-brand-700 hover:underline"
                      >
                        {client.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {client.phone ? (
                      <a
                        href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}
                        className="whitespace-nowrap hover:text-brand-700 hover:underline"
                        dir="ltr"
                      >
                        {client.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4">
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
              {filteredClients.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-12 text-center text-sm text-slate-500"
                  >
                    {t.clients.noneFound}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-sm text-slate-500">
        Showing {filteredClients.length} of {clients.length} clients
      </p>
    </div>
  );
}
