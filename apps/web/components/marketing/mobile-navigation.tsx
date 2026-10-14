"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "@/components/i18n/link";

type MobileNavigationProps = {
  /** In-page sections, e.g. { href: "#services", label: "Services" }. */
  items: readonly { href: string; label: string }[];
  signIn: string;
  languageName: string;
  languagePath: "/en" | "/ar";
  language: "en" | "ar";
};

export default function MobileNavigation({
  items,
  signIn,
  languageName,
  languagePath,
  language,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeLabel = language === "ar" ? "إغلاق قائمة التنقل" : "Close navigation menu";
  const close = () => setIsOpen(false);
  const itemClass = "rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50";

  return (
    <div className="relative md:hidden">
      <button
        type="button"
        aria-label={isOpen ? closeLabel : language === "ar" ? "فتح قائمة التنقل" : "Open navigation menu"}
        aria-expanded={isOpen}
        aria-controls="mobile-marketing-navigation"
        onClick={() => setIsOpen((open) => !open)}
        className="flex size-10 items-center justify-center rounded-lg border border-slate-200 text-slate-800 hover:bg-slate-50"
      >
        {isOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>
      {isOpen && (
        <>
          <button
            type="button"
            aria-label={closeLabel}
            onClick={close}
            className="fixed inset-0 z-40 cursor-default"
          />
          <nav
            id="mobile-marketing-navigation"
            aria-label={language === "ar" ? "التنقل الرئيسي" : "Main navigation"}
            className="absolute end-0 top-12 z-50 flex w-56 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            {items.map((item) => (
              <a key={item.href} className={itemClass} href={item.href} onClick={close}>
                {item.label}
              </a>
            ))}
            <Link className={itemClass} href={languagePath} onClick={close}>
              {languageName}
            </Link>
            <Link
              className="mt-1 rounded-lg bg-brand-600 px-3 py-2.5 text-center text-sm font-medium text-white hover:bg-brand-700"
              href="/login"
              onClick={close}
            >
              {signIn}
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}
