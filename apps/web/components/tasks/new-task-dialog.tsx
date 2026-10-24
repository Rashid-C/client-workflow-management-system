"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { TaskType } from "@/lib/task-types";
import type { Assignable, TaskDetail } from "@/lib/tasks";
import { alertClass, labelClass } from "@/components/ui/styles";

type ClientOption = { id: number; name: string; clientCode: string; isActive: boolean };

export default function NewTaskDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (task: TaskDetail) => void;
}) {
  const { can } = useCurrentUser();
  const { t, errorText } = useI18n();
  const canAssign = can("tasks.assign");

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [types, setTypes] = useState<TaskType[]>([]);
  const [people, setPeople] = useState<Assignable[]>([]);
  const [loadError, setLoadError] = useState("");

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [assignees, setAssignees] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;
    Promise.all([
      api<ClientOption[]>("/clients", { signal }),
      api<TaskType[]>("/task-types", { signal }),
      canAssign ? api<Assignable[]>("/tasks/assignable-employees", { signal }) : Promise.resolve([]),
    ])
      .then(([clientRows, typeRows, peopleRows]) => {
        setClients(clientRows.filter((client) => client.isActive));
        setTypes(typeRows);
        setPeople(peopleRows);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setLoadError(errorText(err, t.tasks.unableToLoadForm));
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [canAssign]);

  const type = types.find((t) => String(t.id) === typeId);

  async function create() {
    setError("");
    if (!title.trim()) return setError(t.tasks.needTitle);
    if (!clientId) return setError(t.tasks.needClient);
    if (!type) return setError(t.tasks.needType);

    setSaving(true);
    try {
      const task = await api<TaskDetail>("/tasks", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          clientId: Number(clientId),
          taskTypeId: type.id,
          dueDate: dueDate || undefined,
          description: description.trim() || undefined,
          assignees: Object.entries(assignees)
            .filter(([, employeeId]) => employeeId)
            .map(([position, employeeId]) => ({
              position: Number(position),
              employeeId: Number(employeeId),
            })),
        }),
      });
      onCreated(task);
    } catch (err) {
      setError(errorText(err, t.tasks.unableToCreate));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={t.tasks.newTask}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>{t.common.cancel}</button>
          <button type="button" onClick={() => void create()} disabled={saving} className={primaryButton}>
            {saving ? t.tasks.creating : t.tasks.create}
          </button>
        </>
      }
    >
      {loadError && <p role="alert" className={alertClass}>{loadError}</p>}

      <div>
        <label htmlFor="task-title" className={labelClass}>{t.tasks.titleLabel} *</label>
        <input
          id="task-title"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t.tasks.titlePlaceholder}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="task-client" className={labelClass}>{t.common.client} *</label>
          <select id="task-client" value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}>
            <option value="">{t.tasks.chooseClient}</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.clientCode})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-type" className={labelClass}>{t.tasks.taskType} *</label>
          <select
            id="task-type"
            value={typeId}
            onChange={(event) => {
              setTypeId(event.target.value);
              setAssignees({});
            }}
            className={inputClass}
          >
            <option value="">{t.tasks.chooseType}</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="task-due" className={labelClass}>{t.tasks.dueDate}</label>
        <input id="task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
      </div>

      <div>
        <label htmlFor="task-description" className={labelClass}>{t.tasks.description}</label>
        <textarea
          id="task-description"
          rows={3}
          maxLength={2000}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={inputClass}
        />
      </div>

      {type && canAssign && (
        <fieldset>
          <legend className="text-sm font-medium">{t.tasks.stageAssignees}</legend>
          <p className="text-xs text-slate-500">
            {t.tasks.stageAssigneesHint}
          </p>
          <ol className="mt-2 space-y-2">
            {type.stages.map((stage) => (
              <li key={stage.position} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <label htmlFor={`assignee-${stage.position}`} className="text-sm">
                  <span className="text-slate-500">{stage.position}.</span> {stage.name}
                </label>
                <select
                  id={`assignee-${stage.position}`}
                  value={assignees[stage.position] ?? ""}
                  onChange={(event) =>
                    setAssignees((current) => ({ ...current, [stage.position]: event.target.value }))
                  }
                  className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">{t.common.unassigned}</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </li>
            ))}
          </ol>
        </fieldset>
      )}

      {error && <p role="alert" className={alertClass}>{error}</p>}
    </Modal>
  );
}
