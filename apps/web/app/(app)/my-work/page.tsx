"use client";

import { useEffect, useState } from "react";
import MyWorkList from "@/components/dashboard/my-work-list";
import { api } from "@/lib/api";
import type { Dashboard } from "@/lib/dashboard";
import { formatMinutes } from "@/lib/tasks";

export default function MyWorkPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<Dashboard>("/dashboard", { signal: controller.signal })
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "Unable to load your work.");
      });
    return () => controller.abort();
  }, []);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">My work</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every open stage assigned to you, earliest due date first.
          {data && ` You have logged ${formatMinutes(data.me.minutesThisWeek)} this week.`}
        </p>
      </header>

      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white">
        {data ? (
          <MyWorkList items={data.myWork} />
        ) : (
          !error && <p role="status" className="py-8 text-center text-sm text-slate-500">Loading...</p>
        )}
      </section>
    </div>
  );
}
