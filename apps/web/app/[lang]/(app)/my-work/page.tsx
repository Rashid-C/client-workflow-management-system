"use client";

import { useEffect, useState } from "react";
import MyWorkList from "@/components/dashboard/my-work-list";
import { useI18n } from "@/components/i18n/i18n-provider";
import { api } from "@/lib/api";
import type { Dashboard } from "@/lib/dashboard";

export default function MyWorkPage() {
  const { t, minutes, errorText } = useI18n();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<Dashboard>("/dashboard", { signal: controller.signal })
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(errorText(err, t.myWork.unableToLoad));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t.myWork.title}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t.myWork.subtitle}
          {data && t.myWork.loggedThisWeek(minutes(data.me.minutesThisWeek))}
        </p>
      </header>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white">
        {data ? (
          <MyWorkList items={data.myWork} />
        ) : (
          !error && <p role="status" className="py-8 text-center text-sm text-slate-500">{t.common.loading}</p>
        )}
      </section>
    </div>
  );
}
