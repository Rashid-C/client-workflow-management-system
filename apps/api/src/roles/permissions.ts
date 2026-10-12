/**
 * The fixed permission catalogue. A permission only means something when
 * server code checks it, so the list lives here rather than in the database;
 * the database stores which role holds which key (RolePermission).
 *
 * `scoped` permissions can be granted as "own" (records the person is
 * assigned to or created) or "all". Unscoped ones are always "all".
 *
 * Super Admin is not stored as rows: a system role implicitly holds every
 * permission here at "all", so new permissions reach it without a migration.
 */
export const PERMISSIONS = [
  { key: 'dashboard.view', category: 'Dashboard & Reports', scoped: false },
  { key: 'reports.view', category: 'Dashboard & Reports', scoped: true },
  { key: 'reports.export', category: 'Dashboard & Reports', scoped: true },

  { key: 'clients.view', category: 'Clients', scoped: true },
  { key: 'clients.create', category: 'Clients', scoped: false },
  { key: 'clients.edit', category: 'Clients', scoped: true },
  { key: 'clients.delete', category: 'Clients', scoped: false },

  { key: 'tasks.view', category: 'Tasks & Work', scoped: true },
  { key: 'tasks.create', category: 'Tasks & Work', scoped: false },
  { key: 'tasks.edit', category: 'Tasks & Work', scoped: true },
  { key: 'tasks.delete', category: 'Tasks & Work', scoped: false },
  { key: 'tasks.assign', category: 'Tasks & Work', scoped: true },
  { key: 'tasks.complete', category: 'Tasks & Work', scoped: true },
  { key: 'tasks.reopen', category: 'Tasks & Work', scoped: false },

  { key: 'employees.view', category: 'Employees', scoped: true },
  { key: 'employees.create', category: 'Employees', scoped: false },
  { key: 'employees.edit', category: 'Employees', scoped: false },
  { key: 'employees.deactivate', category: 'Employees', scoped: false },

  { key: 'workflows.view', category: 'Workflows', scoped: false },
  { key: 'workflows.manage', category: 'Workflows', scoped: false },

  { key: 'documents.view', category: 'Documents & Expiry', scoped: true },
  { key: 'documents.create', category: 'Documents & Expiry', scoped: false },
  { key: 'documents.edit', category: 'Documents & Expiry', scoped: true },
  { key: 'documents.delete', category: 'Documents & Expiry', scoped: false },

  { key: 'time_logs.view', category: 'Time Logs & Daily Updates', scoped: true },
  { key: 'time_logs.create', category: 'Time Logs & Daily Updates', scoped: false },
  { key: 'time_logs.edit', category: 'Time Logs & Daily Updates', scoped: true },
  { key: 'daily_updates.view', category: 'Time Logs & Daily Updates', scoped: true },
  { key: 'daily_updates.create', category: 'Time Logs & Daily Updates', scoped: false },

  { key: 'leads.view', category: 'Leads & Follow-ups', scoped: true },
  { key: 'leads.create', category: 'Leads & Follow-ups', scoped: false },
  { key: 'leads.edit', category: 'Leads & Follow-ups', scoped: true },
  { key: 'leads.delete', category: 'Leads & Follow-ups', scoped: false },

  { key: 'roles.view', category: 'Roles & Settings', scoped: false },
  { key: 'roles.manage', category: 'Roles & Settings', scoped: false },
  { key: 'settings.manage', category: 'Roles & Settings', scoped: false },
  { key: 'history.view', category: 'Roles & Settings', scoped: true },
] as const satisfies readonly {
  key: string;
  category: string;
  scoped: boolean;
}[];

export type PermissionKey = (typeof PERMISSIONS)[number]['key'];
export type PermissionScope = 'own' | 'all';

const PERMISSION_BY_KEY: ReadonlyMap<string, (typeof PERMISSIONS)[number]> =
  new Map(PERMISSIONS.map((permission) => [permission.key, permission]));

export function isPermissionKey(key: string): key is PermissionKey {
  return PERMISSION_BY_KEY.has(key);
}

export function isScopedPermission(key: PermissionKey): boolean {
  return PERMISSION_BY_KEY.get(key)?.scoped ?? false;
}
