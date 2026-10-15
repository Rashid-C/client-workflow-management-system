/**
 * Stable codes for every error the API reports on purpose.
 *
 * The web app shows a message per code in the reader's language; `message`
 * stays English for logs and anyone calling the API directly. Variable parts
 * travel unformatted in `params` (names, ISO days, minutes, statuses) so each
 * language can format them its own way.
 *
 * A code is part of the API contract: rename one only together with the web
 * dictionaries (errors.spec.ts checks both languages cover every code).
 */
export const ERROR_CODES = [
  'validation_failed',
  'invalid_date',

  'auth.origin_not_allowed',
  'auth.sign_in_required',
  'auth.password_change_required',
  'auth.forbidden',
  'auth.invalid_login',
  'auth.locked',
  'auth.current_password_incorrect',
  'auth.password_unchanged',
  'auth.password_is_email',

  'clients.code_taken',
  'clients.not_found',
  'clients.stale',
  'clients.archived',
  'clients.vat_trn_taken',
  'clients.ct_trn_taken',
  'clients.has_open_tasks',
  'clients.inactive_manager',

  'employees.not_found',
  'employees.role_missing',
  'employees.cannot_deactivate_self',
  'employees.last_super_admin',
  'employees.code_or_email_taken',
  'employees.stale',
  'employees.super_admin_only',
  'employees.cannot_change_own_roles',
  'employees.cannot_reset_own_password',

  'documents.not_found',
  'documents.stale',
  'documents.client_not_found',
  'documents.client_archived',
  'documents.invalid_dates',

  'leads.not_found',
  'leads.stale',
  'leads.inactive_owner',
  'leads.lost_reason_required',
  'leads.converted_locked',
  'leads.already_converted',
  'leads.lost_cannot_convert',
  'leads.convert_forbidden',

  'roles.not_found',
  'roles.stale',
  'roles.system_locked',
  'roles.in_use',
  'roles.name_taken',
  'roles.duplicate_permission',
  'roles.scope_not_allowed',

  'task_types.not_found',
  'task_types.stale',
  'task_types.name_taken',
  'task_types.name_required',
  'task_types.stage_blank',
  'task_types.stage_duplicate',

  'tasks.not_found',
  'tasks.stale',
  'tasks.archived',
  'tasks.type_not_found',
  'tasks.type_inactive',
  'tasks.type_no_stages',
  'tasks.type_too_few_stages',
  'tasks.client_not_found',
  'tasks.client_archived',
  'tasks.assign_forbidden',
  'tasks.duplicate_assignee',
  'tasks.inactive_assignee',
  'tasks.handover_forbidden',
  'tasks.stage_not_yours',
  'tasks.stage_not_found',
  'tasks.earlier_stages_open',
  'tasks.start_needs_pending',
  'tasks.complete_needs_in_progress',
  'tasks.cannot_block',
  'tasks.resume_needs_blocked',
  'tasks.reassign_completed',
  'tasks.reopen_needs_completed',
  'tasks.last_stage',
  'tasks.already_assigned',
  'tasks.reassign_comment_required',
  'tasks.block_reason_required',
  'tasks.reopen_reason_required',
  'tasks.time_required',
  'tasks.future_time',
  'tasks.day_full',
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

export type ErrorParams = Record<string, string | number>;

/** The JSON body of a coded error. */
export type Problem = {
  code: ErrorCode;
  message: string;
  params?: ErrorParams;
};

/**
 * The body for a Nest exception, e.g.
 * `throw new NotFoundException(problem('tasks.not_found', 'Task not found'))`.
 * The exception keeps `message`, so `error.message` reads as before.
 */
export function problem(code: ErrorCode, message: string, params?: ErrorParams): Problem {
  return params ? { code, message, params } : { code, message };
}

type FieldError = {
  property: string;
  constraints?: Record<string, string>;
  children?: FieldError[];
};

/** class-validator's errors as sentences, with a path for nested fields. */
export function validationMessages(errors: readonly FieldError[], parent = ''): string[] {
  return errors.flatMap((error) => [
    ...Object.values(error.constraints ?? {}).map((message) => parent + message),
    ...validationMessages(error.children ?? [], `${parent}${error.property}.`),
  ]);
}
