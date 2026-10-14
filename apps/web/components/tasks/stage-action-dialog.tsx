"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import TimeInput from "@/components/tasks/time-input";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { officeToday, type Assignable, type TaskDetail, type TaskStage } from "@/lib/tasks";

export type StageDialogKind = "complete" | "block" | "reassign" | "reopen";

/** One dialog per stage action, asking exactly what that action needs (slide 13). */
export default function StageActionDialog({
  kind,
  task,
  stage,
  people,
  canHandOver,
  onClose,
  onDone,
}: {
  kind: StageDialogKind;
  task: TaskDetail;
  stage: TaskStage;
  people: Assignable[];
  canHandOver: boolean;
  onClose: () => void;
  onDone: (task: TaskDetail) => void;
}) {
  const { t } = useI18n();
  const nextStage = task.stages.find((s) => s.position === stage.position + 1);
  const titles: Record<StageDialogKind, string> = {
    complete: t.tasks.completeStage,
    block: t.tasks.blockStage,
    reassign: t.tasks.reassignStage,
    reopen: t.tasks.reopenStage,
  };

  const [minutes, setMinutes] = useState(0);
  const [workDate, setWorkDate] = useState(officeToday());
  const [text, setText] = useState("");
  const [nextAssigneeId, setNextAssigneeId] = useState(
    nextStage?.assignee ? String(nextStage.assignee.id) : "",
  );
  const [assigneeId, setAssigneeId] = useState(stage.assignee ? String(stage.assignee.id) : "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    setError("");
    let body: Record<string, unknown>;

    if (kind === "complete") {
      if (minutes < 1) return setError(t.tasks.needTime);
      body = {
        minutes,
        workDate,
        comment: text.trim() || undefined,
        // Only send a handover when it changes who has the next stage.
        nextAssigneeId:
          nextAssigneeId && Number(nextAssigneeId) !== nextStage?.assignee?.id
            ? Number(nextAssigneeId)
            : undefined,
      };
    } else if (kind === "block") {
      if (!text.trim()) return setError(t.tasks.needReason);
      body = { reason: text.trim(), ...(minutes ? { minutes, workDate } : {}) };
    } else if (kind === "reassign") {
      const to = assigneeId ? Number(assigneeId) : null;
      if (to === (stage.assignee?.id ?? null)) return setError(t.tasks.needSomeoneElse);
      if (stage.assignee && !text.trim()) {
        return setError(t.tasks.needComment);
      }
      body = { assigneeId: to, comment: text.trim() || undefined, ...(minutes ? { minutes, workDate } : {}) };
    } else {
      if (!text.trim()) return setError(t.tasks.needReopenReason);
      body = { comment: text.trim() };
    }

    setSaving(true);
    try {
      const updated = await api<TaskDetail>(`/tasks/${task.id}/stages/${stage.position}/${kind}`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      onDone(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.tasks.unableToSave);
      setSaving(false);
    }
  }

  const timeOptional = kind === "block" || kind === "reassign";

  return (
    <Modal
      title={titles[kind]}
      subtitle={t.tasks.stageSubtitle(stage.position, stage.name)}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>{t.common.cancel}</button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className={kind === "block" ? `${primaryButton} bg-red-600 hover:bg-red-700` : primaryButton}
          >
            {saving
              ? t.common.saving
              : { complete: t.tasks.markCompleted, block: t.tasks.markBlocked, reassign: t.common.save, reopen: t.tasks.reopenAction }[kind]}
          </button>
        </>
      }
    >
      {kind === "reassign" && (
        <div>
          <label htmlFor="stage-assignee" className="text-sm font-medium">{t.tasks.assignTo}</label>
          <select id="stage-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className={inputClass}>
            <option value="">{t.common.unassigned}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.designation}</option>
            ))}
          </select>
        </div>
      )}

      {kind !== "reopen" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
          <TimeInput
            id="stage-time"
            label={timeOptional ? t.tasks.timeSpentSoFar : t.tasks.timeSpent}
            required={!timeOptional}
            minutes={minutes}
            onChange={setMinutes}
          />
          <div>
            <label htmlFor="stage-date" className="text-sm font-medium">{t.common.date}</label>
            <input
              id="stage-date"
              type="date"
              value={workDate}
              max={officeToday()}
              onChange={(event) => setWorkDate(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      )}

      <div>
        <label htmlFor="stage-text" className="text-sm font-medium">
          {kind === "block"
            ? `${t.tasks.whyBlocked} *`
            : kind === "reopen"
              ? `${t.tasks.whyReopen} *`
              : kind === "reassign" && stage.assignee
                ? `${t.common.comment} *`
                : t.common.comment}
        </label>
        <textarea
          id="stage-text"
          rows={3}
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={kind === "complete" ? t.tasks.optionalNotes : undefined}
          className={inputClass}
        />
        {kind === "reopen" && (
          <p className="mt-1 text-xs text-slate-500">
            {t.tasks.reopenHint}
          </p>
        )}
      </div>

      {kind === "complete" && nextStage && canHandOver && (
        <div>
          <label htmlFor="stage-next" className="text-sm font-medium">
            {t.tasks.assignNext(nextStage.name)}
          </label>
          <select id="stage-next" value={nextAssigneeId} onChange={(event) => setNextAssigneeId(event.target.value)} className={inputClass}>
            <option value="">{nextStage.assignee ? t.tasks.keep(nextStage.assignee.name) : t.tasks.leaveUnassigned}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.designation}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">{t.tasks.handOverHint}</p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
