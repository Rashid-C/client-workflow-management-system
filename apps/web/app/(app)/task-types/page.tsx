"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import { api } from "@/lib/api";
import type { TaskType } from "@/lib/task-types";

export default function TaskTypesPage() {
  const { can } = useCurrentUser();
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
        setError(err instanceof Error ? err.message : "Unable to load task types.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [showInactive]);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Task types</h1>
          <p className="mt-1 text-sm text-slate-500">
            Each task type has its own ordered list of stages. Tasks copy the
            stages when they are created, so edits here only affect new tasks.
          </p>
        </div>
        {can("workflows.manage") && (
          <Link
            href="/task-types/new"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={16} aria-hidden="true" />
            New task type
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
        Show inactive
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p role="status" className="py-8 text-center text-sm text-slate-500">
          Loading task types...
        </p>
      ) : types.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
          <p className="font-medium">No task types yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Create one to define the stages a new task starts with.
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
                  <ChevronRight size={18} className="shrink-0 text-slate-400" aria-hidden="true" />
                </div>
                {!type.isActive && (
                  <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-600">
                    Inactive
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
