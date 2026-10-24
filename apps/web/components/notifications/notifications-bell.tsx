"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { api } from "@/lib/api";
import { notificationTime, type NotificationItem, type NotificationPage } from "@/lib/notifications";

export default function NotificationsBell() {
  const { t, locale, errorText } = useI18n();
  const n = t.notifications;
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [count, setCount] = useState(0);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [page, unread] = await Promise.all([
        api<NotificationPage>("/notifications?limit=10"),
        api<{ count: number }>("/notifications/unread-count"),
      ]);
      setItems(page.items);
      setCount(unread.count);
      setError("");
    } catch (err) {
      setError(errorText(err, n.unableToLoad));
    }
  }, [errorText, n.unableToLoad]);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 60_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [refresh]);

  async function markRead(item: NotificationItem) {
    if (item.readAt) return;
    try {
      await api(`/notifications/${item.id}/read`, { method: "POST" });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setCount((current) => Math.max(0, current - 1));
    } catch (err) {
      setError(errorText(err, n.unableToUpdate));
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={n.title}
        aria-expanded={open}
        aria-controls="notification-menu"
        onClick={() => { setOpen((value) => !value); if (!open) void refresh(); }}
        className="relative inline-flex size-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
      >
        <Bell size={18} aria-hidden="true" />
        {count > 0 && <span className="absolute -end-1 -top-1 min-w-4 rounded-full bg-red-600 px-1 text-center text-[10px] leading-4 text-white">{count > 99 ? "99+" : count}</span>}
      </button>
      {open && (
        <section id="notification-menu" className="absolute end-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="font-semibold text-slate-900">{n.title}</h2>
            {count > 0 && <button type="button" onClick={async () => {
              try { await api("/notifications/read-all", { method: "POST" }); await refresh(); }
              catch (err) { setError(errorText(err, n.unableToUpdate)); }
            }} className="text-xs font-medium text-brand-800 hover:underline">{n.markAllRead}</button>}
          </div>
          {error && <p role="alert" className="px-4 py-2 text-xs text-red-700">{error}</p>}
          {items.length ? <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {items.map((item) => <li key={item.id}>
              <Link href={item.link} onClick={() => void markRead(item)} className={`block px-4 py-3 hover:bg-slate-50 ${item.readAt ? "" : "bg-brand-50/60"}`}>
                <span className="flex items-center gap-2 text-xs font-semibold text-brand-800"><span>{n.kinds[item.kind]}</span>{!item.readAt && <span className="size-1.5 rounded-full bg-brand-600" />}</span>
                <span className="mt-1 block text-sm font-medium text-slate-900">{item.title}</span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">{item.body}</span>
                <span className="mt-1 block text-[11px] text-slate-500">{notificationTime(item.createdAt, locale)}</span>
              </Link>
            </li>)}</ul> : <p className="px-4 py-8 text-center text-sm text-slate-500">{n.empty}</p>}
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-slate-100 px-4 py-3 text-center text-sm font-medium text-brand-800 hover:bg-slate-50">{n.title}</Link>
        </section>
      )}
    </div>
  );
}
