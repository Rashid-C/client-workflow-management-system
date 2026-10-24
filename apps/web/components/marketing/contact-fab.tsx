"use client";

import { Mail, MessageCircle, Phone, X, type LucideIcon } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { telHref } from "@/lib/office";

type Labels = { open: string; close: string; whatsapp: string; call: string; email: string };

/** "+971 58 584 8008" → "https://wa.me/971585848008". */
const whatsappHref = (phone: string) => `https://wa.me/${phone.replace(/\D/g, "")}`;

/**
 * Floating contact button in the corner of the public page: opens WhatsApp
 * (each office number), a call and an email.
 */
export default function ContactFab({ labels, phones, email }: { labels: Labels; phones: readonly string[]; email: string }) {
  const [open, setOpen] = useState(false);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const items: { href: string; label: string; detail?: string; icon: LucideIcon; tone: string; external?: boolean }[] = [
    ...phones.map((phone) => ({
      href: whatsappHref(phone),
      label: labels.whatsapp,
      detail: phone,
      icon: MessageCircle,
      tone: "bg-emerald-500",
      external: true,
    })),
    { href: telHref(phones[0]), label: labels.call, detail: phones[0], icon: Phone, tone: "bg-signal-600" },
    { href: `mailto:${email}`, label: labels.email, icon: Mail, tone: "bg-rose-500" },
  ];

  return (
    <div className="fixed bottom-5 end-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <ul id={listId} className="flex flex-col items-end gap-3">
          {items.map(({ href, label, detail, icon: Icon, tone, external }) => (
            <li key={href}>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="group flex items-center gap-2.5"
              >
                <span className="rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-800 shadow-lg">
                  {label}
                  {detail && <span dir="ltr" className="ms-1.5 text-slate-500">{detail}</span>}
                </span>
                <span className={`grid size-12 place-items-center rounded-full text-white shadow-lg transition group-hover:scale-105 ${tone}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={listId}
        aria-label={open ? labels.close : labels.open}
        // The white ring keeps it visible over the blue hero.
        className="grid size-14 place-items-center rounded-full bg-signal-600 text-white shadow-xl shadow-signal-900/30 ring-4 ring-white/80 transition hover:bg-signal-700"
      >
        {open ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}
      </button>
    </div>
  );
}
