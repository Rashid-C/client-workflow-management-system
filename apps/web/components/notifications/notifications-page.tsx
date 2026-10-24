"use client";

import { useCallback, useEffect, useState } from "react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { api } from "@/lib/api";
import { notificationTime, type NotificationItem, type NotificationPage } from "@/lib/notifications";
import { Page, PageHeader } from "@/components/ui/page";
import { emptyClass, secondaryButton } from "@/components/ui/styles";

export default function NotificationsPage() {
  const { t, locale, errorText } = useI18n();
  const { user, updateUser } = useCurrentUser();
  const n = t.notifications;
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (nextCursor?: string, replace = false) => {
    try {
      const query = new URLSearchParams({ limit: "50" });
      if (nextCursor) query.set("cursor", nextCursor);
      const page = await api<NotificationPage>(`/notifications?${query}`);
      setItems((current) => replace ? page.items : [...current, ...page.items]);
      setCursor(page.nextCursor);
      setError("");
    } catch (err) {
      setError(errorText(err, n.unableToLoad));
    } finally { setLoading(false); }
  }, [errorText, n.unableToLoad]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(undefined, true), 0);
    const timer = window.setInterval(() => void load(undefined, true), 60_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [load]);

  async function markRead(item: NotificationItem) {
    if (item.readAt) return;
    try {
      await api(`/notifications/${item.id}/read`, { method: "POST" });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
    } catch (err) { setError(errorText(err, n.unableToUpdate)); }
  }

  async function markAllRead() {
    setBusy(true);
    try {
      await api("/notifications/read-all", { method: "POST" });
      setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch (err) { setError(errorText(err, n.unableToUpdate)); }
    finally { setBusy(false); }
  }

  async function setEmailEnabled(enabled: boolean) {
    setBusy(true);
    setNotice("");
    try {
      await api<void>("/auth/me/notifications", {
        method: "PUT",
        body: JSON.stringify({ emailNotificationsEnabled: enabled }),
      });
      updateUser({ emailNotificationsEnabled: enabled });
      setNotice(n.saved);
    } catch (err) { setError(errorText(err, n.unableToUpdate)); }
    finally { setBusy(false); }
  }

  return (
    <Page size="form">
      <PageHeader
        eyebrow={t.nav.groups.workspace}
        title={n.title}
        subtitle={n.subtitle}
        actions={items.some((item) => !item.readAt) && <button type="button" disabled={busy} onClick={() => void markAllRead()} className={secondaryButton}>{n.markAllRead}</button>}
      />

      <section className="mb-6 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={user?.emailNotificationsEnabled ?? true} disabled={busy} onChange={(event) => void setEmailEnabled(event.target.checked)} className="mt-1 size-4 accent-teal-700" />
          <span><span className="block text-sm font-medium text-slate-900">{n.emailEnabled}</span><span className="mt-1 block text-xs text-slate-500">{n.emailHint}</span></span>
        </label>
        {notice && <p role="status" className="mt-3 text-sm text-emerald-700">{notice}</p>}
      </section>

      {error && <p role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      {loading && <p role="status" className="py-8 text-center text-sm text-slate-500">{n.loading}</p>}
      {!loading && items.length === 0 && <p className={emptyClass}>{n.empty}</p>}
      <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.map((item) => <li key={item.id}>
          <Link href={item.link} onClick={() => void markRead(item)} className={`block px-4 py-4 sm:px-5 ${item.readAt ? "hover:bg-slate-50" : "bg-brand-50/50 hover:bg-brand-50"}`}>
            <span className="flex items-center gap-2 text-xs font-semibold text-brand-800"><span>{n.kinds[item.kind]}</span>{!item.readAt && <span className="size-1.5 rounded-full bg-brand-600" />}</span>
            <span className="mt-1 block font-medium text-slate-900">{item.title}</span>
            <span className="mt-1 block text-sm leading-6 text-slate-600">{item.body}</span>
            <span className="mt-2 block text-xs text-slate-400">{notificationTime(item.createdAt, locale)}</span>
          </Link>
        </li>)}
      </ul>
      {cursor && <div className="mt-5 text-center"><button type="button" disabled={busy} onClick={async () => { setBusy(true); await load(cursor); setBusy(false); }} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50">{n.loadMore}</button></div>}
    </Page>
  );
}
