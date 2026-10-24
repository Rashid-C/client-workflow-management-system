"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Plus, Trash2 } from "lucide-react";
import EntityHistory from "@/components/audit/entity-history";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link, { useRouter } from "@/components/i18n/link";
import { api, ApiError } from "@/lib/api";
import { MAX_STAGES, type TaskType } from "@/lib/task-types";
import { alertClass, labelClass } from "@/components/ui/styles";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500 disabled:bg-slate-50";

type DraftStage = { key: number; name: string };

let nextKey = 1;
const draft = (names: string[]): DraftStage[] =>
  names.map((name) => ({ key: nextKey++, name }));

/** Create (`typeId` null) or edit a task type. Nothing is saved until Save. */
export default function TaskTypeEditor({ typeId }: { typeId: number | null }) {
  const router = useRouter();
  const { can } = useCurrentUser();
  const { t, errorText } = useI18n();
  const canManage = can("workflows.manage");

  const [loaded, setLoaded] = useState<TaskType | null>(null);
  const [allTypes, setAllTypes] = useState<TaskType[]>([]);
  const [loading, setLoading] = useState(typeId !== null);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [stages, setStages] = useState<DraftStage[]>(() => draft([""]));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showCopy, setShowCopy] = useState(false);
  const lastStageInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    Promise.all([
      typeId === null ? Promise.resolve(null) : api<TaskType>(`/task-types/${typeId}`, { signal }),
      api<TaskType[]>("/task-types?includeInactive=true", { signal }),
    ])
      .then(([type, types]) => {
        setAllTypes(types);
        if (type) {
          setLoaded(type);
          setName(type.name);
          setDescription(type.description ?? "");
          setIsActive(type.isActive);
          setStages(draft(type.stages.map((stage) => stage.name)));
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setLoadError(errorText(err, t.taskTypes.unableToLoadOne));
      })
      .finally(() => {
        if (!signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [typeId]);

  const dirty = useMemo(() => {
    const names = stages.map((stage) => stage.name.trim());
    if (!loaded) return Boolean(name.trim() || description.trim() || names.some(Boolean));
    return (
      name.trim() !== loaded.name ||
      description.trim() !== (loaded.description ?? "") ||
      isActive !== loaded.isActive ||
      names.join("\u0000") !== loaded.stages.map((stage) => stage.name).join("\u0000")
    );
  }, [loaded, name, description, isActive, stages]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty || saving) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, saving]);

  function updateStage(key: number, value: string) {
    setStages((current) =>
      current.map((stage) => (stage.key === key ? { ...stage, name: value } : stage)),
    );
  }

  function moveStage(index: number, offset: -1 | 1) {
    setStages((current) => {
      const next = [...current];
      const [stage] = next.splice(index, 1);
      next.splice(index + offset, 0, stage);
      return next;
    });
  }

  function addStage() {
    setStages((current) => [...current, ...draft([""])]);
    // Focus the new field once it renders.
    window.setTimeout(() => lastStageInput.current?.focus(), 0);
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const names = stages.map((stage) => stage.name.trim());
    if (!name.trim()) return setError(t.taskTypes.needName);
    if (names.length === 0) return setError(t.taskTypes.needStage);
    if (names.some((stageName) => !stageName)) return setError(t.taskTypes.needStageNames);
    const lower = names.map((stageName) => stageName.toLowerCase());
    if (new Set(lower).size !== lower.length) return setError(t.taskTypes.needDistinct);

    setSaving(true);
    try {
      const body = { name: name.trim(), description: description.trim() || undefined, stages: names };
      if (loaded) {
        const saved = await api<TaskType>(`/task-types/${loaded.id}`, {
          method: "PUT",
          body: JSON.stringify({ ...body, isActive, version: loaded.version }),
        });
        setLoaded(saved);
        setStages(draft(saved.stages.map((stage) => stage.name)));
        setSaving(false);
      } else {
        const created = await api<TaskType>("/task-types", {
          method: "POST",
          body: JSON.stringify(body),
        });
        router.replace(`/task-types/${created.id}`);
      }
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === "task_types.stale" && loaded
          ? `${errorText(err, t.tasks.unableToSave)}${t.taskTypes.staleSuffix}`
          : errorText(err, t.tasks.unableToSave),
      );
      setSaving(false);
    }
  }

  if (loading) {
    return <p role="status" className="p-6 text-sm text-slate-500">{t.taskTypes.loadingOne}</p>;
  }
  if (loadError) {
    return (
      <div className="p-6">
        <p role="alert" className={alertClass}>{loadError}</p>
        <Link href="/task-types" className="mt-3 inline-block text-sm text-brand-700 hover:underline">
          {t.taskTypes.back}
        </Link>
      </div>
    );
  }

  const copySources = allTypes.filter((type) => type.id !== loaded?.id);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 pb-10 text-slate-900 sm:p-6">
      <div>
        <Link href="/task-types" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900">
          <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
          {t.taskTypes.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {loaded ? loaded.name : t.taskTypes.newTypeTitle}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {loaded ? t.taskTypes.usedBy(loaded.taskCount) : ""}
          {t.taskTypes.newOnly}
        </p>
      </div>

      <form onSubmit={save} className="space-y-6" noValidate>
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="type-name" className={labelClass}>{t.taskTypes.name} *</label>
              <input
                id="type-name"
                value={name}
                maxLength={100}
                disabled={!canManage}
                onChange={(event) => setName(event.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="type-description" className={labelClass}>{t.taskTypes.description}</label>
              <input
                id="type-description"
                value={description}
                maxLength={500}
                disabled={!canManage}
                onChange={(event) => setDescription(event.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          {loaded && (
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={isActive}
                disabled={!canManage}
                onChange={(event) => setIsActive(event.target.checked)}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">{t.taskTypes.active}</span>
                <span className="block text-xs text-slate-500">
                  {t.taskTypes.activeHint}
                </span>
              </span>
            </label>
          )}
        </section>

        <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">{t.taskTypes.stagesCount(stages.length)}</h2>
              <p className="text-xs text-slate-500">
                {t.taskTypes.stagesHint}
              </p>
            </div>
            {canManage && copySources.length > 0 && (
              <button
                type="button"
                onClick={() => setShowCopy(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100"
              >
                <Copy size={15} aria-hidden="true" />
                {t.taskTypes.copyFrom}
              </button>
            )}
          </div>

          <ol className="space-y-2">
            {stages.map((stage, index) => (
              <li key={stage.key} className="flex items-center gap-2">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xs text-slate-600">
                  {index + 1}
                </span>
                <label htmlFor={`stage-${stage.key}`} className="sr-only">
                  {t.taskTypes.stageNameLabel(index + 1)}
                </label>
                <input
                  id={`stage-${stage.key}`}
                  ref={index === stages.length - 1 ? lastStageInput : undefined}
                  value={stage.name}
                  maxLength={100}
                  disabled={!canManage}
                  onChange={(event) => updateStage(stage.key, event.target.value)}
                  placeholder={t.taskTypes.stageName}
                  className={`${inputClass} mt-0`}
                />
                {canManage && (
                  <div className="flex shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => moveStage(index, -1)}
                      disabled={index === 0}
                      aria-label={t.taskTypes.moveUp(index + 1)}
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveStage(index, 1)}
                      disabled={index === stages.length - 1}
                      aria-label={t.taskTypes.moveDown(index + 1)}
                      className="rounded-md p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setStages((current) => current.filter((s) => s.key !== stage.key))}
                      disabled={stages.length === 1}
                      aria-label={t.taskTypes.remove(index + 1)}
                      className="rounded-md p-2 text-red-600 hover:bg-red-50 disabled:opacity-30"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>

          {canManage && (
            <button
              type="button"
              onClick={addStage}
              disabled={stages.length >= MAX_STAGES}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
            >
              <Plus size={15} aria-hidden="true" />
              {t.taskTypes.addStage}
            </button>
          )}
        </section>

        {error && (
          <p role="alert" className={alertClass}>
            {error}
          </p>
        )}

        {canManage && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !dirty}
              className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? t.common.saving : loaded ? t.taskTypes.saveChanges : t.taskTypes.create}
            </button>
          </div>
        )}
      </form>

      {loaded && canManage && (
        <section className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <h2 className="text-sm font-semibold">{t.taskTypes.deleteTitle}</h2>
            <p className="text-xs text-slate-500">
              {t.taskTypes.deleteHint}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              const verb = loaded.taskCount > 0 ? t.taskTypes.deactivate : t.common.delete;
              if (!window.confirm(t.taskTypes.confirmRemove(verb, loaded.name))) return;
              setSaving(true);
              try {
                const result = await api<{ deleted: boolean; taskType: TaskType | null }>(
                  `/task-types/${loaded.id}`,
                  { method: "DELETE" },
                );
                if (result.deleted || !result.taskType) {
                  router.replace("/task-types");
                  return;
                }
                setLoaded(result.taskType);
                setIsActive(result.taskType.isActive);
              } catch (err) {
                setError(errorText(err, t.taskTypes.unableToDelete));
              }
              setSaving(false);
            }}
            className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loaded.taskCount > 0 ? t.taskTypes.deactivate : t.common.delete}
          </button>
        </section>
      )}

      {loaded && can("history.view") && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
          <EntityHistory entityType="TaskType" entityId={String(loaded.id)} key={loaded.version} />
        </section>
      )}

      {showCopy && (
        <CopyStagesDialog
          sources={copySources}
          onClose={() => setShowCopy(false)}
          onCopy={(names, mode) => {
            setStages((current) => {
              const kept = mode === "append" ? current.filter((stage) => stage.name.trim()) : [];
              return [...kept, ...draft(names)].slice(0, MAX_STAGES);
            });
            setShowCopy(false);
          }}
        />
      )}
    </div>
  );
}

function CopyStagesDialog({
  sources,
  onClose,
  onCopy,
}: {
  sources: TaskType[];
  onClose: () => void;
  onCopy: (names: string[], mode: "replace" | "append") => void;
}) {
  const { t } = useI18n();
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? 0);
  const [mode, setMode] = useState<"replace" | "append">("replace");
  const source = sources.find((type) => type.id === sourceId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="copy-stages-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <h2 id="copy-stages-title" className="font-semibold">{t.taskTypes.copyTitle}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {t.taskTypes.copyHint}
        </p>

        <label htmlFor="copy-source" className="mt-4 block text-sm font-medium">{t.taskTypes.copySource}</label>
        <select
          id="copy-source"
          value={sourceId}
          onChange={(event) => setSourceId(Number(event.target.value))}
          className={inputClass}
        >
          {sources.map((type) => (
            <option key={type.id} value={type.id}>
              {t.taskTypes.copyOption(type.name, type.stages.length, type.isActive)}
            </option>
          ))}
        </select>

        {source && (
          <ol className="mt-3 flex flex-wrap gap-1.5">
            {source.stages.map((stage) => (
              <li key={stage.position} className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">
                {stage.position}. {stage.name}
              </li>
            ))}
          </ol>
        )}

        <fieldset className="mt-4 space-y-1 text-sm">
          <legend className="sr-only">{t.taskTypes.howToCopy}</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="copy-mode" checked={mode === "replace"} onChange={() => setMode("replace")} />
            {t.taskTypes.replace}
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="copy-mode" checked={mode === "append"} onChange={() => setMode("append")} />
            {t.taskTypes.append}
          </label>
        </fieldset>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-100"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            disabled={!source}
            onClick={() => source && onCopy(source.stages.map((stage) => stage.name), mode)}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {t.taskTypes.copyStages}
          </button>
        </div>
      </section>
    </div>
  );
}
