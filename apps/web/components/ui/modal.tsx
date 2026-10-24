"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/components/i18n/i18n-provider";

const FIELDS = "input, select, textarea";
const FOCUSABLE = `a[href], button:not([disabled]), ${FIELDS}, [tabindex]:not([tabindex="-1"])`;

function focusables(root: HTMLElement) {
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    (el) => !el.hasAttribute("disabled") && el.getClientRects().length > 0,
  );
}

/** Dialog that opens from the bottom on phones and centred on larger screens. */
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** Room for a two-column form. */
  wide?: boolean;
}) {
  const titleId = useId();
  const { t } = useI18n();
  const dialog = useRef<HTMLElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keyboard users land in the dialog, Tab stays inside it, and closing it
  // puts them back on the control that opened it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const root = dialog.current;
    if (root && !root.contains(document.activeElement)) {
      const field = root.querySelector<HTMLElement>(`${FIELDS}:not([disabled])`);
      (field ?? focusables(root)[0])?.focus();
    }
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !root) return;
      const items = focusables(root);
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      if (opener?.isConnected) opener.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-[2px] sm:items-center sm:p-4">
      <section
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-xl ${wide ? "sm:max-w-3xl" : "sm:max-w-lg"}`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X size={18} />
          </button>
        </header>
        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/70 px-5 py-3 sm:flex-row sm:justify-end sm:rounded-b-xl">
          {footer}
        </footer>
      </section>
    </div>
  );
}

// Kept here so existing imports keep working; the definitions live in styles.ts.
export { inputClass, primaryButton, secondaryButton } from "@/components/ui/styles";
