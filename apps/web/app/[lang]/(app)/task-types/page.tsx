"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import { api } from "@/lib/api";
import type { TaskType } from "@/lib/task-types";

export default function TaskTypesPage() {
  const { can } = useCurrentUser();
  const { t } = useI18n();
  const [showInactive, setShowInactive] = useState(false);
  const [types, setTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    api<TaskType[]>(`/task-types?includeInactive=${showInactive}`, {
      signal: controller.signal,
    })
      .then((data) => {
        setTypes(data);
        setError("");
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : t.taskTypes.unableToLoad);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [showInactive]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t.taskTypes.title}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.taskTypes.subtitle}
          </p>
        </div>
        {can("workflows.manage") && (
          <Link
            href="/task-types/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} aria-hidden="true" />
            {t.taskTypes.newType}
          </Link>
        )}
      </header>

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(event) => {
            setLoading(true);
            setShowInactive(event.target.checked);
          }}
        />
        {t.taskTypes.showInactive}
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          {t.taskTypes.loading}
        </p>
      ) : types.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
          <p className="font-medium">{t.taskTypes.noneYet}</p>
          <p className="mt-1 text-sm text-slate-500">
            {t.taskTypes.noneYetHint}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {types.map((type) => (
            <li key={type.id}>
              <Link
                href={`/task-types/${type.id}`}
                className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{type.name}</h2>
                    {type.description && (
                      <p className="mt-0.5 text-sm text-slate-500">{type.description}</p>
                    )}
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-slate-400 rtl:rotate-180" aria-hidden="true" />
                </div>
                {!type.isActive && (
                  <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    {t.taskTypes.inactive}
                  </span>
                )}
                <ol className="mt-3 flex flex-wrap gap-1.5">
                  {type.stages.map((stage) => (
                    <li
                      key={stage.position}
                      className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                    >
                      {stage.position}. {stage.name}
                    </li>
                  ))}
                </ol>
                <p className="mt-3 text-xs text-slate-500">
                  {t.taskTypes.taskCount(type.taskCount)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
