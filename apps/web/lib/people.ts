// Employees and roles as the API returns them (apps/api/src/employees, roles).

export type EmployeeStatus = "Active" | "Inactive";
export type PermissionScope = "own" | "all";

export type RoleSummary = { id: number; name: string; isSystem: boolean };

export type Employee = {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  status: EmployeeStatus;
  joinedDate: string;
  roles: RoleSummary[];
  version: number;
  openStages: number;
  mustChangePassword: boolean;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
};

export type RoleGrant = { key: string; scope: PermissionScope };

export type Role = RoleSummary & {
  description: string | null;
  version: number;
  memberCount: number;
  permissions: RoleGrant[];
};

/** One entry of GET /roles/permissions, in display order. */
export type PermissionInfo = { key: string; category: string; scoped: boolean };

/** Badge colours: Super Admin purple, other roles neutral. */
export function roleStyle(role: RoleSummary): string {
  if (role.isSystem) return "border-purple-200 bg-purple-50 text-purple-700";
  if (role.name === "Manager") return "border-navy-200 bg-navy-50 text-navy-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

/**
 * YYYY-MM-DD for the user's local day. toISOString() would give the UTC day,
 * which is yesterday in Abu Dhabi between midnight and 4 a.m.
 */
export function todayInBrowserTimeZone(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export const isSuperAdmin = (employee: { roles: RoleSummary[] }) =>
  employee.roles.some((role) => role.isSystem);
