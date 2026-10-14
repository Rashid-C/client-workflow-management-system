"use client";

import type { ReactNode } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import LanguageSwitch from "@/components/i18n/language-switch";
import Link from "@/components/i18n/link";

/** Centered card for the signed-out pages (sign-in, password change). */
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
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-8 text-slate-950 sm:px-8">
      <div className="w-full max-w-5xl">
        <header className="mb-5 flex items-center justify-between px-1 sm:mb-7">
          <Link href="/" className="text-2xl font-semibold tracking-tight text-slate-950" dir="ltr">
            tickwise<span className="text-blue-600">.</span>
          </Link>
          <LanguageSwitch className="px-2 py-1" />
        </header>
        <section className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_80px_-40px_rgba(15,23,42,0.3)] md:min-h-[440px] md:grid-cols-2">
          <div className="flex items-center p-6 sm:p-10 lg:p-14">
            <div className="mx-auto w-full max-w-sm">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="mb-7 mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
              {children}
            </div>
          </div>
          <aside className="relative hidden flex-col justify-center overflow-hidden bg-[#111318] px-10 py-12 text-white md:flex lg:px-14">
            <div className="absolute inset-0 opacity-[0.12] marketing-grid" aria-hidden="true" />
            <div className="relative">
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
      </div>
    </main>
  );
}
