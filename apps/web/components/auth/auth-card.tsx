"use client";

import type { ReactNode } from "react";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import BrandLogo, { BRAND_NAME } from "@/components/brand/brand-logo";
import { useI18n } from "@/components/i18n/i18n-provider";
import LanguageSwitch from "@/components/i18n/language-switch";
import Link from "@/components/i18n/link";
import { OFFICE, telHref } from "@/lib/office";

/**
 * Frame for the signed-out pages (sign-in, password change): the public
 * site's header and a slim footer around a centred card.
 */
export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen flex-col bg-porcelain text-slate-950">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link href="/" aria-label={t.auth.homeLink} className="shrink-0">
            <BrandLogo variant="full" priority />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              aria-label={t.auth.backToWebsite}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
              <span className="hidden sm:inline">{t.auth.backToWebsite}</span>
            </Link>
            <LanguageSwitch className="min-h-10 px-3 font-medium" />
          </div>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-4 py-10 sm:px-8 sm:py-14">
        <div className="marketing-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />
        <section className="relative grid w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.3)] md:min-h-110 md:grid-cols-2">
          <div className="flex items-center p-6 sm:p-10 lg:p-14">
            <div className="mx-auto w-full max-w-sm">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mb-7 mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
              {children}
            </div>
          </div>
          <aside className="relative hidden flex-col justify-center overflow-hidden bg-navy-950 px-10 py-12 text-white md:flex lg:px-14">
            <div className="absolute inset-0 opacity-[0.12] marketing-grid" aria-hidden="true" />
            <div className="relative">
              {/* On navy, slate-400 is the readable grey; slate-500 falls below AA. */}
              <p className="mb-4 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                {t.auth.workspaceLabel}
              </p>
              <h2 className="max-w-sm text-3xl font-semibold leading-tight tracking-tight">
                {t.auth.welcomeTitle}
              </h2>
              <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
                {t.auth.welcomeSubtitle}
              </p>
              <div className="mt-10 border-t border-white/15 pt-5 text-xs text-slate-400">
                {t.auth.welcomeFooter}
              </div>
            </div>
          </aside>
        </section>
      </main>

      <footer className="bg-navy-950 text-slate-400">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-6 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 {BRAND_NAME}. {t.auth.rightsReserved}</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <a href={telHref(OFFICE.phones[0])} dir="ltr" className="inline-flex items-center gap-1.5 transition hover:text-white">
              <Phone size={13} aria-hidden="true" />
              {OFFICE.phones[0]}
            </a>
            <a href={`mailto:${OFFICE.email}`} dir="ltr" className="inline-flex items-center gap-1.5 transition hover:text-white">
              <Mail size={13} aria-hidden="true" />
              {OFFICE.email}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
