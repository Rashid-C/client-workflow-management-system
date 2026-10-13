"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/components/auth/current-user";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { TaskType } from "@/lib/task-types";
import type { Assignable, TaskDetail } from "@/lib/tasks";

type ClientOption = { id: number; name: string; clientCode: string; isActive: boolean };

export default function NewTaskDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (task: TaskDetail) => void;
}) {
  const { can } = useCurrentUser();
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
        setLoadError(err instanceof Error ? err.message : "Unable to load the form.");
      });
    return () => controller.abort();
  }, [canAssign]);

  const type = types.find((t) => String(t.id) === typeId);

  async function create() {
    setError("");
    if (!title.trim()) return setError("Give the task a title.");
    if (!clientId) return setError("Choose a client.");
    if (!type) return setError("Choose a task type.");

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
      setError(err instanceof Error ? err.message : "Unable to create the task.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title="New task"
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="button" onClick={() => void create()} disabled={saving} className={primaryButton}>
            {saving ? "Creating..." : "Create task"}
          </button>
        </>
      }
    >
      {loadError && <p role="alert" className="text-sm text-red-700">{loadError}</p>}

      <div>
        <label htmlFor="task-title" className="text-sm font-medium">Title *</label>
        <input
          id="task-title"
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. FY2026 ICV certificate"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="task-client" className="text-sm font-medium">Client *</label>
          <select id="task-client" value={clientId} onChange={(event) => setClientId(event.target.value)} className={inputClass}>
            <option value="">Choose a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name} ({client.clientCode})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="task-type" className="text-sm font-medium">Task type *</label>
          <select
            id="task-type"
            value={typeId}
            onChange={(event) => {
              setTypeId(event.target.value);
              setAssignees({});
            }}
            className={inputClass}
          >
            <option value="">Choose a type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="task-due" className="text-sm font-medium">Due date</label>
        <input id="task-due" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} className={inputClass} />
      </div>

      <div>
        <label htmlFor="task-description" className="text-sm font-medium">Description</label>
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
          <legend className="text-sm font-medium">Stage assignees</legend>
          <p className="text-xs text-slate-500">
            Optional; stages can also be assigned later or handed over as work progresses.
          </p>
          <ol className="mt-2 space-y-2">
            {type.stages.map((stage) => (
              <li key={stage.position} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                <label htmlFor={`assignee-${stage.position}`} className="text-sm">
                  <span className="text-slate-400">{stage.position}.</span> {stage.name}
                </label>
                <select
                  id={`assignee-${stage.position}`}
                  value={assignees[stage.position] ?? ""}
                  onChange={(event) =>
                    setAssignees((current) => ({ ...current, [stage.position]: event.target.value }))
                  }
                  className="w-44 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                >
                  <option value="">Unassigned</option>
                  {people.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </li>
            ))}
          </ol>
        </fieldset>
      )}

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
