"use client";

import { Languages } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";

/** EN ⇄ عربي. Saves the choice and reloads the page in the other language. */
export default function LanguageSwitch({ className = "" }: { className?: string }) {
  const { t, locale, switchTo } = useI18n();
  const [busy, setBusy] = useState(false);
  const other = locale === "ar" ? "en" : "ar";

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        void switchTo(other);
      }}
      aria-label={t.language.switchToName}
      lang={other}
      className={`inline-flex items-center gap-2 rounded-md text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-50 ${className}`}
    >
      <Languages size={18} strokeWidth={1.8} aria-hidden="true" />
      <span>{t.language.switchTo}</span>
    </button>
  );
}
