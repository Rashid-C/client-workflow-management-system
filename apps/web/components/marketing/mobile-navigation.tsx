"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import Link from "@/components/i18n/link";

type MobileNavigationProps = {
  features: string;
  workflow: string;
  team: string;
  languageName: string;
  languagePath: "/en" | "/ar";
  language: "en" | "ar";
};

export default function MobileNavigation({
  features,
  workflow,
  team,
  languageName,
  languagePath,
  language,
}: MobileNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const closeLabel = language === "ar" ? "إغلاق قائمة التنقل" : "Close navigation menu";

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
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <nav
            id="mobile-marketing-navigation"
            aria-label={language === "ar" ? "التنقل الرئيسي" : "Main navigation"}
            className="absolute end-0 top-12 z-50 flex w-56 flex-col gap-1 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          >
            <a className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50" href="#features" onClick={() => setIsOpen(false)}>{features}</a>
            <a className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50" href="#workflow" onClick={() => setIsOpen(false)}>{workflow}</a>
            <a className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50" href="#team" onClick={() => setIsOpen(false)}>{team}</a>
            <Link className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50" href={languagePath} onClick={() => setIsOpen(false)}>{languageName}</Link>
          </nav>
        </>
      )}
    </div>
  );
}
