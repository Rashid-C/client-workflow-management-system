"use client";

import { useState } from "react";
import TimeInput from "@/components/tasks/time-input";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { officeToday, type Assignable, type TaskDetail, type TaskStage } from "@/lib/tasks";

export type StageDialogKind = "complete" | "block" | "reassign" | "reopen";

const TITLES: Record<StageDialogKind, string> = {
  complete: "Complete stage",
  block: "Block stage",
  reassign: "Reassign stage",
  reopen: "Reopen stage",
};

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
  const nextStage = task.stages.find((s) => s.position === stage.position + 1);

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
      if (minutes < 1) return setError("Enter the time spent.");
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
      if (!text.trim()) return setError("Say why the stage is blocked.");
      body = { reason: text.trim(), ...(minutes ? { minutes, workDate } : {}) };
    } else if (kind === "reassign") {
      const to = assigneeId ? Number(assigneeId) : null;
      if (to === (stage.assignee?.id ?? null)) return setError("Choose someone else.");
      if (stage.assignee && !text.trim()) {
        return setError("Add a comment when moving a stage from one person to another.");
      }
      body = { assigneeId: to, comment: text.trim() || undefined, ...(minutes ? { minutes, workDate } : {}) };
    } else {
      if (!text.trim()) return setError("Say why the stage is reopened.");
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
      setError(err instanceof Error ? err.message : "Unable to save.");
      setSaving(false);
    }
  }

  const timeOptional = kind === "block" || kind === "reassign";

  return (
    <Modal
      title={TITLES[kind]}
      subtitle={`Stage ${stage.position} · ${stage.name}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving}
            className={kind === "block" ? `${primaryButton} bg-red-600 hover:bg-red-700` : primaryButton}
          >
            {saving
              ? "Saving..."
              : { complete: "Mark completed", block: "Mark blocked", reassign: "Save", reopen: "Reopen stage" }[kind]}
          </button>
        </>
      }
    >
      {kind === "reassign" && (
        <div>
          <label htmlFor="stage-assignee" className="text-sm font-medium">Assign to</label>
          <select id="stage-assignee" value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className={inputClass}>
            <option value="">Unassigned</option>
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
            label={timeOptional ? "Time spent so far" : "Time spent"}
            required={!timeOptional}
            minutes={minutes}
            onChange={setMinutes}
          />
          <div>
            <label htmlFor="stage-date" className="text-sm font-medium">Date</label>
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
            ? "Why is it blocked? *"
            : kind === "reopen"
              ? "Why reopen it? *"
              : kind === "reassign" && stage.assignee
                ? "Comment *"
                : "Comment"}
        </label>
        <textarea
          id="stage-text"
          rows={3}
          maxLength={2000}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={kind === "complete" ? "Optional notes" : undefined}
          className={inputClass}
        />
        {kind === "reopen" && (
          <p className="mt-1 text-xs text-slate-500">
            Later stages that are in progress or blocked go back to Pending.
          </p>
        )}
      </div>

      {kind === "complete" && nextStage && canHandOver && (
        <div>
          <label htmlFor="stage-next" className="text-sm font-medium">
            Assign next stage: {nextStage.name}
          </label>
          <select id="stage-next" value={nextAssigneeId} onChange={(event) => setNextAssigneeId(event.target.value)} className={inputClass}>
            <option value="">{nextStage.assignee ? `Keep ${nextStage.assignee.name}` : "Leave unassigned"}</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name} · {p.designation}</option>
            ))}
          </select>
          <p className="mt-1 text-xs text-slate-500">Hand the next stage over to a colleague.</p>
        </div>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
