
"use client";

import { useMemo, useState } from "react";

type Permission = {
  key: string;
  label: string;
  description: string;
  ownAll: boolean;
};

type PermissionCategory = {
  name: string;
  description: string;
  permissions: Permission[];
};

type AccessScope = "Own" | "All";

const permissionDefinitions: PermissionCategory[] = [
  {
    name: "Dashboard & Reports",
    description: "View business summaries and reporting data.",
    permissions: [
      { key: "dashboard.view", label: "View dashboard", description: "Open the dashboard.", ownAll: false },
      { key: "reports.view", label: "View reports", description: "Access operational and time reports.", ownAll: true },
      { key: "reports.export", label: "Export reports", description: "Download report data.", ownAll: true },
    ],
  },
  {
    name: "Clients",
    description: "Manage client and customer records.",
    permissions: [
      { key: "clients.view", label: "View clients", description: "View client details.", ownAll: true },
      { key: "clients.create", label: "Create clients", description: "Add new client records.", ownAll: false },
      { key: "clients.edit", label: "Edit clients", description: "Update client information.", ownAll: true },
      { key: "clients.delete", label: "Delete clients", description: "Remove client records.", ownAll: false },
    ],
  },
  {
    name: "Tasks & Work",
    description: "Manage assignments, stages, and work progress.",
    permissions: [
      { key: "tasks.view", label: "View tasks", description: "View task details and progress.", ownAll: true },
      { key: "tasks.create", label: "Create tasks", description: "Create new tasks.", ownAll: false },
      { key: "tasks.edit", label: "Edit tasks", description: "Update task details and status.", ownAll: true },
      { key: "tasks.delete", label: "Delete tasks", description: "Remove tasks.", ownAll: false },
      { key: "tasks.assign", label: "Assign tasks", description: "Allocate work to employees.", ownAll: false },
      { key: "tasks.complete", label: "Complete stages", description: "Mark assigned work complete.", ownAll: false },
      { key: "tasks.reopen", label: "Reopen work", description: "Reopen completed stages.", ownAll: false },
    ],
  },
  {
    name: "Employees",
    description: "Manage staff records and team access.",
    permissions: [
      { key: "employees.view", label: "View employees", description: "View staff directory.", ownAll: true },
      { key: "employees.create", label: "Create employees", description: "Add staff records.", ownAll: false },
      { key: "employees.edit", label: "Edit employees", description: "Update staff details.", ownAll: false },
      { key: "employees.deactivate", label: "Deactivate employees", description: "Change employee status.", ownAll: false },
    ],
  },
  {
    name: "Workflows",
    description: "Configure task types, stages, and ordering.",
    permissions: [
      { key: "workflows.view", label: "View workflows", description: "View configured workflows.", ownAll: false },
      { key: "workflows.manage", label: "Manage workflows", description: "Create and edit workflow stages.", ownAll: false },
    ],
  },
  {
    name: "Documents & Expiry",
    description: "Track client documents and expiry dates.",
    permissions: [
      { key: "documents.view", label: "View documents", description: "View document records.", ownAll: true },
      { key: "documents.create", label: "Add documents", description: "Register a document and its expiry.", ownAll: false },
      { key: "documents.edit", label: "Edit documents", description: "Update document details.", ownAll: true },
      { key: "documents.delete", label: "Delete documents", description: "Remove document records.", ownAll: false },
    ],
  },
  {
    name: "Time Logs & Daily Updates",
    description: "Record work time and daily progress.",
    permissions: [
      { key: "time_logs.view", label: "View time logs", description: "Review recorded work time.", ownAll: true },
      { key: "time_logs.create", label: "Create time logs", description: "Record time spent on work.", ownAll: false },
      { key: "time_logs.edit", label: "Edit time logs", description: "Correct recorded time.", ownAll: true },
      { key: "daily_updates.create", label: "Post daily updates", description: "Record daily work progress.", ownAll: false },
      { key: "daily_updates.view", label: "View daily updates", description: "Review work updates.", ownAll: true },
    ],
  },
  {
    name: "Leads & Follow-ups",
    description: "Track potential clients and follow-up activity.",
    permissions: [
      { key: "leads.view", label: "View leads", description: "View lead records.", ownAll: true },
      { key: "leads.create", label: "Create leads", description: "Register potential clients.", ownAll: false },
      { key: "leads.edit", label: "Edit leads", description: "Update lead and follow-up details.", ownAll: true },
      { key: "leads.delete", label: "Delete leads", description: "Remove lead records.", ownAll: false },
    ],
  },
  {
    name: "Roles & Settings",
    description: "Control access and system configuration.",
    permissions: [
      { key: "roles.view", label: "View roles", description: "View roles and permissions.", ownAll: false },
      { key: "roles.manage", label: "Manage roles", description: "Change role permissions.", ownAll: false },
      { key: "settings.manage", label: "Manage settings", description: "Update system settings.", ownAll: false },
      { key: "history.view", label: "View history", description: "Review recorded activity history.", ownAll: true },
    ],
  },
];

const roleNames = ["Super Admin", "Manager", "Staff"] as const;
type RoleName = (typeof roleNames)[number];

type RoleConfig = {
  permissions: string[];
  scopes: Record<string, AccessScope>;
};

const defaultConfigs: Record<RoleName, RoleConfig> = {
  "Super Admin": {
    permissions: permissionDefinitions.flatMap((category) =>
      category.permissions.map((permission) => permission.key),
    ),
    scopes: Object.fromEntries(
      permissionDefinitions
        .flatMap((category) => category.permissions)
        .map((permission) => [permission.key, "All"]),
    ),
  },
  Manager: {
    permissions: [
      "dashboard.view",
      "reports.view",
      "clients.view",
      "clients.create",
      "clients.edit",
      "tasks.view",
      "tasks.create",
      "tasks.edit",
      "tasks.assign",
      "tasks.complete",
      "tasks.reopen",
      "employees.view",
      "workflows.view",
      "documents.view",
      "documents.create",
      "documents.edit",
      "time_logs.view",
      "time_logs.create",
      "time_logs.edit",
      "daily_updates.view",
      "daily_updates.create",
      "leads.view",
      "leads.create",
      "leads.edit",
      "history.view",
    ],
    scopes: {},
  },
  Staff: {
    permissions: [
      "dashboard.view",
      "clients.view",
      "tasks.view",
      "tasks.edit",
      "tasks.complete",
      "documents.view",
      "time_logs.view",
      "time_logs.create",
      "daily_updates.view",
      "daily_updates.create",
      "leads.view",
      "leads.edit",
    ],
    scopes: {},
  },
};

for (const roleName of roleNames) {
  for (const category of permissionDefinitions) {
    for (const permission of category.permissions) {
      if (!defaultConfigs[roleName].scopes[permission.key]) {
        defaultConfigs[roleName].scopes[permission.key] = permission.ownAll
          ? roleName === "Staff"
            ? "Own"
            : "All"
          : "All";
      }
    }
  }
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function RolesPage() {
  const [selectedRole, setSelectedRole] = useState<RoleName>("Staff");
  const [configs, setConfigs] = useState(defaultConfigs);
  const [expandedCategories, setExpandedCategories] = useState<string[]>(
    permissionDefinitions.map((category) => category.name),
  );
  const [message, setMessage] = useState("");

  const currentConfig = configs[selectedRole];

  const allPermissions = useMemo(
    () => permissionDefinitions.flatMap((category) => category.permissions),
    [],
  );

  const enabledCount = currentConfig.permissions.length;

  function togglePermission(permissionKey: string) {
    if (selectedRole === "Super Admin") {
      setMessage("Super Admin has full access and cannot have permissions removed.");
      return;
    }

    setConfigs((current) => {
      const config = current[selectedRole];
      const enabled = config.permissions.includes(permissionKey);

      return {
        ...current,
        [selectedRole]: {
          ...config,
          permissions: enabled
            ? config.permissions.filter((key) => key !== permissionKey)
            : [...config.permissions, permissionKey],
        },
      };
    });

    setMessage("");
  }

  function updateScope(permissionKey: string, scope: AccessScope) {
    if (selectedRole === "Super Admin") return;

    setConfigs((current) => ({
      ...current,
      [selectedRole]: {
        ...current[selectedRole],
        scopes: {
          ...current[selectedRole].scopes,
          [permissionKey]: scope,
        },
      },
    }));

    setMessage("");
  }

  function toggleCategory(categoryName: string) {
    setExpandedCategories((current) =>
      current.includes(categoryName)
        ? current.filter((name) => name !== categoryName)
        : [...current, categoryName],
    );
  }

  function resetRole() {
    if (selectedRole === "Super Admin") {
      setMessage("Super Admin permissions are fixed.");
      return;
    }

    setConfigs((current) => ({
      ...current,
      [selectedRole]: {
        permissions: [...defaultConfigs[selectedRole].permissions],
        scopes: { ...defaultConfigs[selectedRole].scopes },
      },
    }));

    setMessage(`${selectedRole} permissions restored to prototype defaults.`);
  }

  function savePrototype() {
    setMessage(
      `Changes for ${selectedRole} are applied in this page only. Database persistence and API authorization are not connected yet.`,
    );
  }

  function enabledInCategory(category: PermissionCategory) {
    return category.permissions.filter((permission) =>
      currentConfig.permissions.includes(permission.key),
    ).length;
  }

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 pb-10 text-slate-900">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">Administration</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Roles & Permissions
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Configure which areas each role can access and whether access is
            limited to their own work or covers all work.
          </p>
        </div>
        <button
          type="button"
          onClick={savePrototype}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Save changes
        </button>
      </header>

      {message && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
            className="shrink-0 font-medium"
          >
            ×
          </button>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {roleNames.map((roleName) => {
          const count = configs[roleName].permissions.length;
          const selected = selectedRole === roleName;

          return (
            <button
              key={roleName}
              type="button"
              onClick={() => {
                setSelectedRole(roleName);
                setMessage("");
              }}
              className={`rounded-xl border p-4 text-left transition ${
                selected
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{roleName}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {roleName === "Super Admin"
                      ? "Full system control"
                      : roleName === "Manager"
                        ? "Manage team and assigned operations"
                        : "Access permitted day-to-day work"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    roleName === "Super Admin"
                      ? "bg-purple-100 text-purple-800"
                      : roleName === "Manager"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {roleName === "Super Admin" ? "Protected" : "Role"}
                </span>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <p className="text-2xl font-semibold">{count}</p>
                <p className="text-xs text-slate-500">
                  of {allPermissions.length} permissions enabled
                </p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    roleName === "Super Admin" ? "bg-purple-500" : "bg-blue-500"
                  }`}
                  style={{
                    width: `${(count / allPermissions.length) * 100}%`,
                  }}
                />
              </div>
            </button>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-col justify-between gap-4 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">{selectedRole}</h2>
              {selectedRole === "Super Admin" && (
                <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-800">
                  Fixed full access
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {enabledCount} permissions enabled across{" "}
              {permissionDefinitions.length} categories.
            </p>
          </div>

          <button
            type="button"
            onClick={resetRole}
            disabled={selectedRole === "Super Admin"}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reset to defaults
          </button>
        </div>

        <div className="divide-y divide-slate-200">
          {permissionDefinitions.map((category) => {
            const expanded = expandedCategories.includes(category.name);
            const enabled = enabledInCategory(category);

            return (
              <section key={category.name}>
                <button
                  type="button"
                  onClick={() => toggleCategory(category.name)}
                  aria-expanded={expanded}
                  className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5"
                >
                  <div>
                    <h3 className="font-medium">{category.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {category.description}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {enabled}/{category.permissions.length}
                    </span>
                    <span aria-hidden="true" className="text-slate-500">
                      {expanded ? "−" : "+"}
                    </span>
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-slate-100 px-4 py-2 sm:px-5">
                    {category.permissions.map((permission) => {
                      const checked = currentConfig.permissions.includes(
                        permission.key,
                      );
                      const scope =
                        currentConfig.scopes[permission.key] ?? "Own";
                      const scopeEnabled =
                        permission.ownAll && checked;

                      return (
                        <div
                          key={permission.key}
                          className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 lg:flex-row lg:items-center lg:justify-between"
                        >
                          <div className="flex min-w-0 items-start gap-3">
                            <input
                              id={`${selectedRole}-${permission.key}`}
                              type="checkbox"
                              checked={checked}
                              disabled={selectedRole === "Super Admin"}
                              onChange={() => togglePermission(permission.key)}
                              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-600 disabled:cursor-not-allowed"
                            />
                            <div className="min-w-0">
                              <label
                                htmlFor={`${selectedRole}-${permission.key}`}
                                className="cursor-pointer text-sm font-medium"
                              >
                                {permission.label}
                              </label>
                              <p className="mt-1 text-sm text-slate-500">
                                {permission.description}
                              </p>
                              <p className="mt-1 font-mono text-xs text-slate-400">
                                {permission.key}
                              </p>
                            </div>
                          </div>

                          {permission.ownAll && (
                            <div className="flex items-center gap-2 pl-7 lg:pl-0">
                              <span className="text-xs font-medium text-slate-500">
                                Scope
                              </span>
                              <select
                                aria-label={`${permission.label} access scope`}
                                value={scope}
                                disabled={
                                  selectedRole === "Super Admin" ||
                                  !scopeEnabled
                                }
                                onChange={(event) =>
                                  updateScope(
                                    permission.key,
                                    event.target.value as AccessScope,
                                  )
                                }
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                              >
                                <option value="Own">Own work</option>
                                <option value="All">All work</option>
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:px-5">
          <p className="text-xs leading-5 text-slate-500">
            Prototype only. Changes are held in page state and reset on refresh.
            API authorization and persistent role configuration are not active.
          </p>
          <button
            type="button"
            onClick={savePrototype}
            className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
          >
            Save changes
          </button>
        </div>
      </section>
    </main>
  );
}
