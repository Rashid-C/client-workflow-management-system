import type { CurrentUser } from "@/lib/api";
import { OFFICE_TIME_ZONE } from "@/lib/audit";

export type WorkStatus = "Pending" | "In progress" | "Completed" | "Blocked";
export const WORK_STATUSES: WorkStatus[] = ["Pending", "In progress", "Completed", "Blocked"];

export type PersonRef = { id: number; name: string };

export type TaskStage = {
  id: number;
  position: number;
  name: string;
  status: WorkStatus;
  assignee: (PersonRef & { designation: string; status: string }) | null;
  startedAt: string | null;
  completedAt: string | null;
  blockedReason: string | null;
  blockedAt: string | null;
  blockedBy: PersonRef | null;
  minutes: number;
};

export type TimeEntry = {
  id: number;
  stagePosition: number;
  stageName: string;
  employee: PersonRef;
  workDate: string;
  minutes: number;
  note: string | null;
  createdAt: string;
};

export type TaskDetail = {
  id: number;
  title: string;
  description: string | null;
  status: WorkStatus;
  dueDate: string | null;
  archivedAt: string | null;
  version: number;
  createdAt: string;
  client: { id: number; name: string; clientCode: string };
  taskType: { id: number; name: string };
  createdBy: PersonRef;
  totalMinutes: number;
  stages: TaskStage[];
  timeEntries: TimeEntry[];
};

export type TaskListItem = {
  id: number;
  title: string;
  status: WorkStatus;
  dueDate: string | null;
  archivedAt: string | null;
  client: { id: number; name: string; clientCode: string };
  taskType: { id: number; name: string };
  stagesTotal: number;
  stagesCompleted: number;
  currentStage: { position: number; name: string; status: WorkStatus; assignee: PersonRef | null } | null;
};

export type Assignable = PersonRef & { designation: string };

export const STATUS_STYLES: Record<WorkStatus, string> = {
  Pending: "border-slate-200 bg-slate-100 text-slate-700",
  "In progress": "border-blue-200 bg-blue-50 text-blue-700",
  Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Blocked: "border-red-200 bg-red-50 text-red-700",
};

/** 4 → "#0004", the number staff search for. */
export const taskRef = (id: number) => `#${String(id).padStart(4, "0")}`;

export function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/** Today's date in the office (Asia/Dubai), as YYYY-MM-DD. */
export function officeToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: OFFICE_TIME_ZONE }).format(new Date());
}

const dayFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** "2026-10-08" → "8 Oct 2026" (a calendar day, so no time zone shift). */
export function formatDay(day: string) {
  return dayFormat.format(new Date(`${day}T00:00:00Z`));
}

export function isOverdue(task: { dueDate: string | null; status: WorkStatus }) {
  return Boolean(task.dueDate && task.status !== "Completed" && task.dueDate < officeToday());
}

/**
 * Mirrors the server's scope rule so only usable buttons are shown:
 * "all" acts on any stage, "own" only on stages assigned to you.
 */
export function canOnStage(
  user: CurrentUser | null,
  permission: string,
  stage: Pick<TaskStage, "assignee">,
) {
  const scope = user?.permissions[permission];
  return scope === "all" || (scope === "own" && stage.assignee?.id === user?.employeeId);
}

export const earlierStagesDone = (stages: TaskStage[], position: number) =>
  stages.filter((s) => s.position < position).every((s) => s.status === "Completed");
