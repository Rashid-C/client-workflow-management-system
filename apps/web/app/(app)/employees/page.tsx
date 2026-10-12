"use client";

import { useEffect, useMemo, useState } from "react";

type EmployeeStatus = "Active" | "Inactive";

type RoleSummary = {
  id: number;
  name: string;
  isSystem: boolean;
};

type ApiRole = RoleSummary & {
  description: string | null;
};

type Employee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  designation: string;
  roles: RoleSummary[];
  status: EmployeeStatus;
  joinedDate: string;
  assignedTasks: number;
};

type ApiEmployee = {
  id: number;
  employeeCode: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string;
  roles: RoleSummary[];
  status: EmployeeStatus;
  joinedDate: string;
  createdAt: string;
  updatedAt: string;
};

const API_BASE = "http://localhost:3001/api/v1";
const API_URL = `${API_BASE}/employees`;
const ROLES_URL = `${API_BASE}/roles`;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500";

function roleStyle(role: RoleSummary) {
  if (role.isSystem) return "border-purple-200 bg-purple-50 text-purple-700";
  if (role.name === "Manager") return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-gray-200 bg-gray-50 text-gray-700";
}

const isSuperAdmin = (employee: Employee) =>
  employee.roles.some((role) => role.isSystem);

function toEmployee(item: ApiEmployee): Employee {
  return {
    id: item.employeeCode,
    name: item.name,
    email: item.email,
    phone: item.phone ?? "",
    designation: item.designation,
    roles: item.roles,
    status: item.status,
    joinedDate: item.joinedDate,
    assignedTasks: 0,
  };
}

// YYYY-MM-DD for the user's local day. toISOString() would give the UTC day,
// which is yesterday in Abu Dhabi between midnight and 4 a.m.
function todayInBrowserTimeZone() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Nest's ValidationPipe returns `message` as a list of field errors.
async function readApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  const message = body?.message;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string" ? message : fallback;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] =
    useState<Employee | null>(null);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [designation, setDesignation] = useState("");
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [joinedDate, setJoinedDate] = useState("");
  const [formError, setFormError] = useState("");

  // New employees start as Staff unless the admin picks otherwise.
  const defaultRoleIds = useMemo(
    () => roles.filter((r) => r.name === "Staff").map((r) => r.id),
    [roles],
  );

  async function loadEmployees(signal?: AbortSignal) {
    setLoadError("");

    try {
      const [employeesResponse, rolesResponse] = await Promise.all([
        fetch(API_URL, { signal }),
        fetch(ROLES_URL, { signal }),
      ]);

      if (!employeesResponse.ok) {
        throw new Error(
          `Unable to load employees (${employeesResponse.status}).`,
        );
      }
      if (!rolesResponse.ok) {
        throw new Error(`Unable to load roles (${rolesResponse.status}).`);
      }

      const data: ApiEmployee[] = await employeesResponse.json();
      const roleData: ApiRole[] = await rolesResponse.json();

      setEmployees(data.map(toEmployee));
      setRoles(roleData);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;

      setLoadError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading employees.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();

    const timer = window.setTimeout(() => {
      setLoading(true);
      void loadEmployees(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: employees.length,
      active: employees.filter((e) => e.status === "Active").length,
      inactive: employees.filter((e) => e.status === "Inactive").length,
      managers: employees.filter((e) =>
        e.roles.some((r) => r.isSystem || r.name === "Manager"),
      ).length,
    }),
    [employees],
  );

  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLowerCase();

    return employees.filter((employee) => {
      const matchesSearch = [
        employee.id,
        employee.name,
        employee.email,
        employee.phone,
        employee.designation,
      ].some((value) => value.toLowerCase().includes(query));

      const matchesRole =
        roleFilter === "All" ||
        employee.roles.some((r) => String(r.id) === roleFilter);

      const matchesStatus =
        statusFilter === "All" || employee.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [employees, search, roleFilter, statusFilter]);

  function resetForm() {
    setName("");
    setEmail("");
    setPhone("");
    setDesignation("");
    setRoleIds(defaultRoleIds);
    setJoinedDate("");
    setFormError("");
  }

  async function addEmployee(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    setMessage("");

    if (
      employees.some(
        (employee) =>
          employee.email.toLowerCase() === email.trim().toLowerCase(),
      )
    ) {
      setFormError("An employee with this email already exists.");
      return;
    }

    const nextNumber =
      Math.max(
        0,
        ...employees.map((employee) =>
          Number(employee.id.replace("EMP-", "")),
        ),
      ) + 1;

    const employeeCode = `EMP-${String(nextNumber).padStart(3, "0")}`;

    if (roleIds.length === 0) {
      setFormError("Choose at least one role.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeCode,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          designation: designation.trim(),
          roleIds,
          status: "Active",
          joinedDate: joinedDate || todayInBrowserTimeZone(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            `Unable to create employee (${response.status}).`,
          ),
        );
      }

      const created: ApiEmployee = await response.json();

      setEmployees((current) => [toEmployee(created), ...current]);
      setShowForm(false);
      resetForm();
      setMessage(`${created.name} was added successfully.`);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to create employee.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(employeeId: string) {
    const target = employees.find((employee) => employee.id === employeeId);
    if (!target) return;

    const nextStatus =
      target.status === "Active" ? "Inactive" : "Active";

    // A courtesy check only; the API enforces this rule authoritatively.
    if (
      isSuperAdmin(target) &&
      target.status === "Active" &&
      nextStatus === "Inactive" &&
      employees.filter(
        (employee) => isSuperAdmin(employee) && employee.status === "Active",
      ).length <= 1
    ) {
      setMessage("At least one active Super Admin must remain.");
      setSelectedEmployee(null);
      return;
    }

    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/${encodeURIComponent(employeeId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            `Status update failed (${response.status}).`,
          ),
        );
      }

      const updated: ApiEmployee = await response.json();

      setEmployees((current) =>
        current.map((employee) =>
          employee.id === updated.employeeCode ? toEmployee(updated) : employee,
        ),
      );

      setSelectedEmployee(null);
      setMessage(`${updated.name} marked ${updated.status.toLowerCase()}.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update employee status.",
      );
    }
  }

  function closeForm() {
    setShowForm(false);
    resetForm();
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-10 text-slate-900">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm text-slate-500">People management</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            Employees
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage staff records, roles, and employee status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setMessage("");
            setRoleIds(defaultRoleIds);
            setShowForm(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          <span aria-hidden="true">+</span>
          Add employee
        </button>
      </header>

      {message && (
        <div
          role="status"
          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
        >
          <span>{message}</span>
          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Dismiss message"
            className="text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total employees", value: stats.total, note: "All staff records" },
          { label: "Active employees", value: stats.active, note: "Currently active" },
          { label: "Inactive employees", value: stats.inactive, note: "Not currently active" },
          { label: "Administrators & managers", value: stats.managers, note: "Elevated role assignments" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-4"
          >
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {stat.value}
            </p>
            <p className="mt-1 text-xs text-slate-500">{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div>
          <h2 className="font-semibold">Employee directory</h2>
          <p className="mt-1 text-sm text-slate-500">
            {filteredEmployees.length} of {employees.length} employees
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label htmlFor="employee-search" className="text-sm font-medium">
              Search
            </label>
            <input
              id="employee-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, ID, designation..."
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="role-filter" className="text-sm font-medium">
              Role
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All roles</option>
              {roles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="text-sm font-medium">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>

        {loading && (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            Loading employees...
          </p>
        )}

        {!loading && loadError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p role="alert" className="text-sm text-red-700">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => void loadEmployees()}
              className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !loadError && filteredEmployees.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center">
            <p className="font-medium">No employees found</p>
            <p className="mt-1 text-sm text-slate-500">
              Try changing your search or filters.
            </p>
          </div>
        )}

        {!loading && !loadError && filteredEmployees.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-212.5 text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-medium">Employee</th>
                    <th className="px-3 py-3 font-medium">Designation</th>
                    <th className="px-3 py-3 font-medium">Role</th>
                    <th className="px-3 py-3 font-medium">Tasks</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="align-middle">
                      <td className="px-3 py-4">
                        <div className="font-medium">{employee.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          {employee.id} · {employee.email}
                        </div>
                      </td>
                      <td className="px-3 py-4">{employee.designation}</td>
                      <td className="px-3 py-4">
                        <div className="flex flex-wrap gap-1">
                          {employee.roles.map((r) => (
                            <span
                              key={r.id}
                              className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${roleStyle(r)}`}
                            >
                              {r.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-4">{employee.assignedTasks}</td>
                      <td className="px-3 py-4">
                        <span
                          className={
                            employee.status === "Active"
                              ? "text-xs font-medium text-emerald-700"
                              : "text-xs font-medium text-slate-500"
                          }
                        >
                          {employee.status}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployee(employee)}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="space-y-3 md:hidden">
              {filteredEmployees.map((employee) => (
                <article
                  key={employee.id}
                  className="rounded-lg border border-slate-200 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-medium">{employee.name}</h3>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        {employee.email}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {employee.id}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      {employee.roles.map((r) => (
                        <span
                          key={r.id}
                          className={`rounded-full border px-2 py-1 text-xs font-medium ${roleStyle(r)}`}
                        >
                          {r.name}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <p>{employee.designation}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {employee.assignedTasks} assigned tasks
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Status: {employee.status}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(employee)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium"
                    >
                      View details
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-employee-title"
            className="my-4 w-full max-w-2xl rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="add-employee-title" className="text-lg font-semibold">
                  Add employee
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Create a staff record for your directory.
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label="Close form"
                className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={addEmployee} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="employee-name" className="text-sm font-medium">
                    Full name *
                  </label>
                  <input
                    id="employee-name"
                    required
                    maxLength={150}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass}
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label htmlFor="employee-email" className="text-sm font-medium">
                    Email address *
                  </label>
                  <input
                    id="employee-email"
                    required
                    type="email"
                    maxLength={254}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={inputClass}
                    placeholder="name@company.com"
                  />
                </div>

                <div>
                  <label htmlFor="employee-phone" className="text-sm font-medium">
                    Phone
                  </label>
                  <input
                    id="employee-phone"
                    type="tel"
                    maxLength={30}
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className={inputClass}
                    placeholder="+971 ..."
                  />
                </div>

                <div>
                  <label htmlFor="employee-designation" className="text-sm font-medium">
                    Designation *
                  </label>
                  <input
                    id="employee-designation"
                    required
                    maxLength={150}
                    value={designation}
                    onChange={(event) => setDesignation(event.target.value)}
                    className={inputClass}
                    placeholder="e.g. Accountant"
                  />
                </div>

                <fieldset>
                  <legend className="text-sm font-medium">Roles *</legend>
                  <div className="mt-1.5 space-y-2 rounded-lg border border-slate-200 p-3">
                    {roles.map((r) => (
                      <label
                        key={r.id}
                        className="flex items-start gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={roleIds.includes(r.id)}
                          onChange={(event) =>
                            setRoleIds((current) =>
                              event.target.checked
                                ? [...current, r.id]
                                : current.filter((id) => id !== r.id),
                            )
                          }
                          className="mt-0.5"
                        />
                        <span>
                          <span className="font-medium">{r.name}</span>
                          {r.description && (
                            <span className="block text-xs text-slate-500">
                              {r.description}
                            </span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Sign-in and access checks are not active yet.
                  </p>
                </fieldset>

                <div>
                  <label htmlFor="employee-joined-date" className="text-sm font-medium">
                    Joining date
                  </label>
                  <input
                    id="employee-joined-date"
                    type="date"
                    value={joinedDate}
                    onChange={(event) => setJoinedDate(event.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              {formError && (
                <p role="alert" className="text-sm text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                  className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add employee"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="employee-details-title"
            className="my-4 w-full max-w-lg rounded-xl border border-slate-200 bg-white p-5 shadow-xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500">
                  {selectedEmployee.id}
                </p>
                <h2
                  id="employee-details-title"
                  className="mt-1 text-xl font-semibold"
                >
                  {selectedEmployee.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedEmployee.designation}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                aria-label="Close employee details"
                className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <dl className="mt-5 divide-y divide-slate-200 text-sm">
              {[
                ["Email", selectedEmployee.email],
                ["Phone", selectedEmployee.phone || "Not provided"],
                [
                  "Roles",
                  selectedEmployee.roles.map((r) => r.name).join(", "),
                ],
                ["Status", selectedEmployee.status],
                ["Joining date", selectedEmployee.joinedDate],
                ["Assigned tasks", String(selectedEmployee.assignedTasks)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="break-all text-right font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => void toggleStatus(selectedEmployee.id)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
              >
                Mark {selectedEmployee.status === "Active" ? "inactive" : "active"}
              </button>
            </div>
          </section>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Employee records and status updates are connected to your local API.
        Task counts are not connected yet.
      </p>
    </div>
  );
}
