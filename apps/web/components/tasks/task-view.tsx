"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, ArchiveRestore, Ban, CheckCircle2, Pencil, Play, RotateCcw, UserRound } from "lucide-react";
import EntityHistory from "@/components/audit/entity-history";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import StageActionDialog, { type StageDialogKind } from "@/components/tasks/stage-action-dialog";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import { DetailHeader, Page } from "@/components/ui/page";
import { buttonClass, labelClass } from "@/components/ui/styles";
import Badge from "@/components/ui/badge";
import {
  canOnStage,
  earlierStagesDone,
  isOverdue,
  STATUS_STYLES,
  taskRef,
  type Assignable,
  type TaskDetail,
  type TaskStage,
} from "@/lib/tasks";

export default function TaskView({ taskId }: { taskId: number }) {
  const { user, can } = useCurrentUser();
  const { t, minutes, day, dateTime, status, errorText } = useI18n();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [people, setPeople] = useState<Assignable[]>([]);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<{ kind: StageDialogKind; stage: TaskStage } | null>(null);
  const [editing, setEditing] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);

  const canAssign = can("tasks.assign");

  useEffect(() => {
    const controller = new AbortController();
    api<TaskDetail>(`/tasks/${taskId}`, { signal: controller.signal })
      .then(setTask)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiError && err.status === 404 ? t.tasks.notFound : errorText(err, t.tasks.unableToLoadTask));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [taskId]);

  useEffect(() => {
    if (!canAssign) return;
    api<Assignable[]>("/tasks/assignable-employees").then(setPeople).catch(() => {});
  }, [canAssign]);

  const updated = useCallback((next: TaskDetail) => {
    setTask(next);
    setDialog(null);
    setEditing(false);
    setActionError("");
    setHistoryKey((key) => key + 1);
  }, []);

  async function quickAction(stage: TaskStage, action: "start" | "resume") {
    setBusy(true);
    setActionError("");
    try {
      updated(await api<TaskDetail>(`/tasks/${taskId}/stages/${stage.position}/${action}`, { method: "POST" }));
    } catch (err) {
      setActionError(errorText(err, t.tasks.unableToUpdate));
    } finally {
      setBusy(false);
    }
  }

  async function setArchived(archived: boolean) {
    if (archived && !window.confirm(t.tasks.confirmArchive)) return;
    setBusy(true);
    try {
      updated(await api<TaskDetail>(`/tasks/${taskId}/${archived ? "archive" : "restore"}`, { method: "POST" }));
    } catch (err) {
      setActionError(errorText(err, t.tasks.unableToUpdateTask));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <Link href="/tasks" className="mt-3 inline-block text-sm text-brand-700 hover:underline">{t.tasks.backToTasks}</Link>
      </div>
    );
  }
  if (!task) return <p role="status" className="p-6 text-sm text-slate-500">{t.tasks.loadingTask}</p>;

  const live = !task.archivedAt;
  const completedCount = task.stages.filter((s) => s.status === "Completed").length;

  return (
    <Page className="space-y-6">
      <DetailHeader
        backHref="/tasks"
        backLabel={t.tasks.title}
        meta={<>
          <span className="text-slate-400" dir="ltr">{taskRef(task.id)}</span>
          <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[task.status]}`}>{status(task.status)}</span>
          {!live && <Badge>{t.tasks.archived}</Badge>}
        </>}
        title={task.title}
        subtitle={<>{task.client.name} · {task.taskType.name}</>}
        actions={<>
          {live && can("tasks.edit") && (
            <button type="button" onClick={() => setEditing(true)} className={buttonClass("secondary", "sm")}>
              <Pencil size={14} aria-hidden="true" /> {t.common.edit}
            </button>
          )}
          {can("tasks.delete") && (
            <button type="button" onClick={() => void setArchived(live)} disabled={busy} className={buttonClass("secondary", "sm")}>
              {live ? <Archive size={14} aria-hidden="true" /> : <ArchiveRestore size={14} aria-hidden="true" />}
              {live ? t.tasks.archive : t.tasks.restore}
            </button>
          )}
        </>}
      />

      {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_18rem]">
        <section aria-labelledby="stages-title" className="rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <h2 id="stages-title" className="font-semibold">{t.tasks.stages}</h2>
            <span className="text-xs text-slate-500" dir="ltr">{completedCount}/{task.stages.length}</span>
          </div>
          <ol className="divide-y divide-slate-100">
            {task.stages.map((stage) => {
              const ready = earlierStagesDone(task.stages, stage.position);
              const canWork = live && canOnStage(user, "tasks.complete", stage);
              const canMove = live && canOnStage(user, "tasks.assign", stage);
              const mine = stage.assignee?.id === user?.employeeId;
              return (
                <li key={stage.id} className={`px-4 py-4 ${stage.status === "Blocked" ? "bg-red-50/40" : ""}`}>
                  <div className="flex items-start gap-3">
                    <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                      stage.status === "Completed" ? "border-emerald-600 bg-emerald-600 text-white"
                      : stage.status === "Blocked" ? "border-red-600 bg-red-600 text-white"
                      : stage.status === "In progress" ? "border-navy-700 bg-navy-700 text-white"
                      : "border-slate-300 text-slate-600"}`}>
                      {stage.position}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{stage.name}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-xs ${STATUS_STYLES[stage.status]}`}>{status(stage.status)}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {stage.assignee ? (
                          <span className={mine ? "font-medium text-brand-700" : ""}>
                            {stage.assignee.name}{mine ? ` (${t.common.you})` : ""}
                            {stage.assignee.status !== "Active" ? ` · ${t.tasks.inactive}` : ""}
                          </span>
                        ) : <em>{t.common.unassigned}</em>}
                        {stage.minutes > 0 && ` · ${t.tasks.logged(minutes(stage.minutes))}`}
                      </p>
                      {stage.status === "Pending" && !ready && (
                        <p className="mt-0.5 text-xs text-slate-400">{t.tasks.startsAfter}</p>
                      )}
                      {stage.status === "Blocked" && stage.blockedReason && (
                        <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                          &ldquo;{stage.blockedReason}&rdquo;
                          {stage.blockedBy && stage.blockedAt && (
                            <span className="text-red-600"> — {stage.blockedBy.name}, {dateTime(stage.blockedAt)}</span>
                          )}
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap gap-2">
                        {canWork && stage.status === "Pending" && ready && (
                          <button type="button" disabled={busy} onClick={() => void quickAction(stage, "start")} className={buttonClass("primary", "sm")}>
                            <Play size={13} className="rtl:rotate-180" aria-hidden="true" /> {t.tasks.start}
                          </button>
                        )}
                        {canWork && stage.status === "In progress" && (
                          <button type="button" onClick={() => setDialog({ kind: "complete", stage })} className={buttonClass("primary", "sm")}>
                            <CheckCircle2 size={13} aria-hidden="true" /> {t.tasks.complete}
                          </button>
                        )}
                        {canWork && stage.status === "Blocked" && ready && (
                          <button type="button" disabled={busy} onClick={() => void quickAction(stage, "resume")} className={buttonClass("primary", "sm")}>
                            <Play size={13} className="rtl:rotate-180" aria-hidden="true" /> {t.tasks.resume}
                          </button>
                        )}
                        {canWork && (stage.status === "In progress" || (stage.status === "Pending" && ready)) && (
                          <button type="button" onClick={() => setDialog({ kind: "block", stage })} className={buttonClass("secondary", "sm")}>
                            <Ban size={13} aria-hidden="true" /> {t.tasks.block}
                          </button>
                        )}
                        {canMove && stage.status !== "Completed" && (
                          <button type="button" onClick={() => setDialog({ kind: "reassign", stage })} className={buttonClass("secondary", "sm")}>
                            <UserRound size={13} aria-hidden="true" /> {stage.assignee ? t.tasks.reassign : t.tasks.assign}
                          </button>
                        )}
                        {live && can("tasks.reopen") && stage.status === "Completed" && (
                          <button type="button" onClick={() => setDialog({ kind: "reopen", stage })} className={buttonClass("secondary", "sm")}>
                            <RotateCcw size={13} aria-hidden="true" /> {t.tasks.reopen}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <dl className="space-y-3">
            <Fact label={t.common.client}>{task.client.name} <span className="text-slate-400" dir="ltr">({task.client.clientCode})</span></Fact>
            <Fact label={t.tasks.taskTypeLabel}>{task.taskType.name}</Fact>
            <Fact label={t.tasks.dueDate}>
              {task.dueDate ? (
                <span className={isOverdue(task) ? "font-semibold text-red-700" : ""}>
                  {day(task.dueDate)}{isOverdue(task) ? t.tasks.overdueSuffix : ""}
                </span>
              ) : t.common.none}
            </Fact>
            <Fact label={t.tasks.totalTime}>{minutes(task.totalMinutes)}</Fact>
            <Fact label={t.tasks.createdBy}>{task.createdBy.name}</Fact>
            <Fact label={t.tasks.created}>{dateTime(task.createdAt)}</Fact>
          </dl>
          {task.description && <p className="mt-4 whitespace-pre-wrap border-t border-slate-100 pt-3 text-slate-700">{task.description}</p>}
        </aside>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section aria-labelledby="time-title" className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 id="time-title" className="text-sm font-semibold">{t.tasks.timeLogs}</h2>
          {task.timeEntries.length === 0 ? (
            <p className="py-3 text-xs text-slate-500">{t.tasks.noTime}</p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {task.timeEntries.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-800">{entry.employee.name} · {entry.stagePosition}. {entry.stageName}</p>
                    <p className="text-slate-500">{day(entry.workDate)}{entry.note ? ` · ${entry.note}` : ""}</p>
                  </div>
                  <span className="shrink-0 font-medium">{minutes(entry.minutes)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {can("history.view") && (
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <EntityHistory key={historyKey} entityType="Task" entityId={String(task.id)} />
          </section>
        )}
      </div>

      {dialog && (
        <StageActionDialog
          kind={dialog.kind}
          task={task}
          stage={dialog.stage}
          people={people}
          canHandOver={canAssign}
          onClose={() => setDialog(null)}
          onDone={updated}
        />
      )}
      {editing && <EditTaskDialog task={task} onClose={() => setEditing(false)} onSaved={updated} />}
    </Page>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-slate-800">{children}</dd>
    </div>
  );
}

function EditTaskDialog({
  task,
  onClose,
  onSaved,
}: {
  task: TaskDetail;
  onClose: () => void;
  onSaved: (task: TaskDetail) => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(task.dueDate ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { t, errorText } = useI18n();

  async function save() {
    if (!title.trim()) return setError(t.tasks.needTitle);
    setSaving(true);
    try {
      onSaved(
        await api<TaskDetail>(`/tasks/${task.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || undefined,
            dueDate: dueDate || null,
            version: task.version,
          }),
        }),
      );
    } catch (err) {
      setError(errorText(err, t.tasks.unableToSave));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={t.tasks.editTask}
      subtitle={taskRef(task.id)}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>{t.common.cancel}</button>
          <button type="button" onClick={() => void save()} disabled={saving} className={primaryButton}>
            {saving ? t.common.saving : t.common.save}
          </button>
        </>
      }
    >
      <div>
        <label htmlFor="edit-title" className={labelClass}>{t.tasks.titleLabel} *</label>
        <input id="edit-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="edit-due" className={labelClass}>{t.tasks.dueDate}</label>
        <input id="edit-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
      </div>
      <div>
        <label htmlFor="edit-description" className={labelClass}>{t.tasks.description}</label>
        <textarea id="edit-description" rows={4} maxLength={2000} value={description} onChange={(event) => setDescription(event.target.value)} className={inputClass} />
      </div>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
