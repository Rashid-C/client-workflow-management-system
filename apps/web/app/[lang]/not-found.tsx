"use client";

import BrandLogo from "@/components/brand/brand-logo";
import Link from "@/components/i18n/link";
import { useI18n } from "@/components/i18n/i18n-provider";

export default function NotFound() {
  const { locale } = useI18n();
  const isArabic = locale === "ar";

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-5 py-16 text-center text-slate-950">
      <div className="max-w-lg">
        <BrandLogo variant="mark" className="mb-8 justify-center" />
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">404</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          {isArabic ? "هذه الصفحة غير موجودة" : "This page can’t be found"}
        </h1>
        <p className="mt-4 text-base leading-7 text-slate-600">
          {isArabic
            ? "قد يكون الرابط قد تغيّر أو أن الصفحة لم تعد متاحة."
            : "The link may have changed, or the page may no longer be available."}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          {isArabic ? "العودة إلى الصفحة الرئيسية" : "Back to the home page"}
        </Link>
      </div>
    </main>
  );
}
