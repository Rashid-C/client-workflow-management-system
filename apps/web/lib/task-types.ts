export type TaskTypeStage = {
  position: number;
  name: string;
};

export type TaskType = {
  id: number;
  name: string;
  description: string | null;
  isActive: boolean;
  version: number;
  taskCount: number;
  stages: TaskTypeStage[];
};

export const MAX_STAGES = 30;
