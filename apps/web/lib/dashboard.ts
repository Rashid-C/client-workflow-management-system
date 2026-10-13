import type { PersonRef, WorkStatus } from "@/lib/tasks";

export type MyWorkItem = {
  task: { id: number; title: string; dueDate: string | null; status: WorkStatus };
  client: { id: number; name: string };
  stage: { position: number; name: string; status: WorkStatus };
  waiting: boolean;
};

export type Dashboard = {
  me: { inProgress: number; pending: number; blocked: number; minutesThisWeek: number };
  myWork: MyWorkItem[];
  team: {
    openTasks: number;
    inProgress: number;
    blocked: number;
    overdue: number;
    unassignedStages: number;
    blockedStages: {
      task: { id: number; title: string };
      client: { id: number; name: string };
      stage: { position: number; name: string };
      assignee: PersonRef | null;
      reason: string | null;
      blockedBy: PersonRef | null;
      blockedAt: string | null;
    }[];
    dueSoon: {
      id: number;
      title: string;
      dueDate: string;
      status: WorkStatus;
      client: { id: number; name: string };
    }[];
    workload: {
      employee: PersonRef & { designation: string };
      openStages: number;
      minutesThisWeek: number;
    }[];
  } | null;
};
