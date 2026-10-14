/**
 * The stage state machine from the Product Overview (slides 12-13):
 *
 *   Pending --start--> In progress --complete--> Completed
 *   Pending --block--> Blocked <--block-- In progress
 *   Blocked --resume--> In progress
 *   Completed --reopen--> In progress (later in-progress/blocked stages
 *                                       go back to Pending)
 *
 * A stage can start, resume or be blocked from Pending only once every
 * earlier stage is completed. Pure functions, so every rule is unit-tested.
 */
import { problem, type Problem } from '../common/errors.js';

export const WORK_STATUSES = ['Pending', 'In progress', 'Completed', 'Blocked'] as const;
export type WorkStatus = (typeof WORK_STATUSES)[number];

export type StageAction =
  | 'start'
  | 'complete'
  | 'block'
  | 'resume'
  | 'reassign'
  | 'reopen';

export interface StageState {
  position: number;
  status: WorkStatus;
}

/** A task is done when every stage is; blocked when any is; else started or not. */
export function deriveTaskStatus(stages: readonly StageState[]): WorkStatus {
  if (stages.length > 0 && stages.every((s) => s.status === 'Completed')) {
    return 'Completed';
  }
  if (stages.some((s) => s.status === 'Blocked')) return 'Blocked';
  if (stages.some((s) => s.status === 'In progress' || s.status === 'Completed')) {
    return 'In progress';
  }
  return 'Pending';
}

/** Why `action` is not allowed on the stage at `position`, or null if it is. */
export function transitionError(
  action: StageAction,
  stages: readonly StageState[],
  position: number,
): Problem | null {
  const stage = stages.find((s) => s.position === position);
  if (!stage) return problem('tasks.stage_not_found', 'Stage not found');

  const earlierDone = stages
    .filter((s) => s.position < position)
    .every((s) => s.status === 'Completed');
  const waiting = problem('tasks.earlier_stages_open', 'Earlier stages must be completed first');
  const { status } = stage;

  switch (action) {
    case 'start':
      if (status !== 'Pending') {
        return problem(
          'tasks.start_needs_pending',
          `Only a pending stage can be started (this one is ${status.toLowerCase()})`,
          { status },
        );
      }
      return earlierDone ? null : waiting;
    case 'complete':
      return status === 'In progress'
        ? null
        : problem('tasks.complete_needs_in_progress', 'Only a stage in progress can be completed');
    case 'block':
      if (status === 'In progress') return null;
      if (status === 'Pending') return earlierDone ? null : waiting;
      return problem('tasks.cannot_block', `A ${status.toLowerCase()} stage cannot be blocked`, {
        status,
      });
    case 'resume':
      if (status !== 'Blocked') {
        return problem('tasks.resume_needs_blocked', 'Only a blocked stage can be resumed');
      }
      return earlierDone ? null : waiting;
    case 'reassign':
      return status === 'Completed'
        ? problem('tasks.reassign_completed', 'A completed stage cannot be reassigned; reopen it first')
        : null;
    case 'reopen':
      return status === 'Completed'
        ? null
        : problem('tasks.reopen_needs_completed', 'Only a completed stage can be reopened');
  }
}

/** The status a successful action leaves the stage in. */
export function nextStatus(action: StageAction, current: WorkStatus): WorkStatus {
  switch (action) {
    case 'start':
    case 'resume':
    case 'reopen':
      return 'In progress';
    case 'complete':
      return 'Completed';
    case 'block':
      return 'Blocked';
    case 'reassign':
      return current;
  }
}

/** Positions that reopening `position` sends back to Pending. */
export function stagesResetByReopen(
  stages: readonly StageState[],
  position: number,
): number[] {
  return stages
    .filter(
      (s) =>
        s.position > position &&
        (s.status === 'In progress' || s.status === 'Blocked'),
    )
    .map((s) => s.position);
}

/** 75 → "1h 15m". */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}
