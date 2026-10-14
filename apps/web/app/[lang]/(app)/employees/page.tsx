"use client";

import { useEffect, useMemo, useState } from "react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import EntityHistory from "@/components/audit/entity-history";
import { api, ApiError } from "@/lib/api";

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
  /** The employee code, e.g. EMP-001. */
  id: string;
  /** Database id; audit entries refer to employees by it. */
  recordId: number;
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
    recordId: item.id,
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

export default function EmployeesPage() {
  const { user, can } = useCurrentUser();
  const { t, day } = useI18n();
  // Status values come from the API in English; show them in the reader's language.
  const statusText = (status: EmployeeStatus) =>
    status === "Active" ? t.employees.active : t.employees.inactive;
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
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [formError, setFormError] = useState("");

  // New employees start as Staff unless the admin picks otherwise.
  const defaultRoleIds = useMemo(
    () => roles.filter((r) => r.name === "Staff").map((r) => r.id),
    [roles],
  );

  async function loadEmployees(signal?: AbortSignal) {
    setLoadError("");

    try {
      const [data, roleData] = await Promise.all([
        api<ApiEmployee[]>("/employees", { signal }),
        // Without roles.view the role filter and form simply stay empty.
        api<ApiRole[]>("/roles", { signal }).catch((error: unknown) => {
          if (error instanceof ApiError && error.status === 403) return [];
          throw error;
        }),
      ]);

      setEmployees(data.map(toEmployee));
      setRoles(roleData);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;

      setLoadError(
        error instanceof Error
          ? error.message
          : t.employees.unableToLoad,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
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
    setTemporaryPassword("");
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
      setFormError(t.employees.duplicateEmail);
      return;
    }

    // Only EMP-### codes count; others (e.g. ADMIN-001) would give NaN.
    const nextNumber =
      Math.max(
        0,
        ...employees.map((employee) => {
          const match = /^EMP-(\d+)$/.exec(employee.id);
          return match ? Number(match[1]) : 0;
        }),
      ) + 1;

    const employeeCode = `EMP-${String(nextNumber).padStart(3, "0")}`;

    if (roleIds.length === 0) {
      setFormError(t.employees.needRole);
      return;
    }

    if (temporaryPassword.length < 12) {
      setFormError(t.employees.passwordTooShort);
      return;
    }

    setSaving(true);

    try {
      const created = await api<ApiEmployee>("/employees", {
        method: "POST",
        body: JSON.stringify({
          employeeCode,
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          designation: designation.trim(),
          roleIds,
          status: "Active",
          joinedDate: joinedDate || todayInBrowserTimeZone(),
          temporaryPassword,
        }),
      });

      setEmployees((current) => [toEmployee(created), ...current]);
      setShowForm(false);
      resetForm();
      setMessage(t.employees.added(created.name));
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : t.employees.unableToCreate,
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
      setMessage(t.employees.lastSuperAdmin);
      setSelectedEmployee(null);
      return;
    }

    setMessage("");

    try {
      const updated = await api<ApiEmployee>(
        `/employees/${encodeURIComponent(employeeId)}/status`,
        { method: "PATCH", body: JSON.stringify({ status: nextStatus }) },
      );

      setEmployees((current) =>
        current.map((employee) =>
          employee.id === updated.employeeCode ? toEmployee(updated) : employee,
        ),
      );

      setSelectedEmployee(null);
      setMessage(t.employees.marked(updated.name, statusText(updated.status)));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : t.employees.unableToUpdate,
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
          <p className="text-sm text-slate-500">{t.employees.eyebrow}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">
            {t.employees.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.employees.subtitle}
          </p>
        </div>

        {can("employees.create") && (
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
            {t.employees.add}
          </button>
        )}
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
            aria-label={t.employees.dismiss}
            className="text-slate-500 hover:text-slate-900"
          >
            ✕
          </button>
        </div>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: t.employees.statTotal, value: stats.total, note: t.employees.statTotalNote },
          { label: t.employees.statActive, value: stats.active, note: t.employees.statActiveNote },
          { label: t.employees.statInactive, value: stats.inactive, note: t.employees.statInactiveNote },
          { label: t.employees.statManagers, value: stats.managers, note: t.employees.statManagersNote },
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
          <h2 className="font-semibold">{t.employees.directory}</h2>
          <p className="mt-1 text-sm text-slate-500">
            {t.employees.count(filteredEmployees.length, employees.length)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label htmlFor="employee-search" className="text-sm font-medium">
              {t.common.search}
            </label>
            <input
              id="employee-search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t.employees.searchPlaceholder}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="role-filter" className="text-sm font-medium">
              {t.employees.role}
            </label>
            <select
              id="role-filter"
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">{t.employees.allRoles}</option>
              {roles.map((r) => (
                <option key={r.id} value={String(r.id)}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="status-filter" className="text-sm font-medium">
              {t.common.status}
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">{t.employees.allStatuses}</option>
              <option value="Active">{t.employees.active}</option>
              <option value="Inactive">{t.employees.inactive}</option>
            </select>
          </div>
        </div>

        {loading && (
          <p role="status" className="py-8 text-center text-sm text-slate-500">
            {t.employees.loading}
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
              {t.employees.tryAgain}
            </button>
          </div>
        )}

        {!loading && !loadError && filteredEmployees.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center">
            <p className="font-medium">{t.employees.noneFound}</p>
            <p className="mt-1 text-sm text-slate-500">
              {t.employees.noneFoundHint}
            </p>
          </div>
        )}

        {!loading && !loadError && filteredEmployees.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-212.5 text-start text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-3 py-3 font-medium">{t.employees.employee}</th>
                    <th className="px-3 py-3 font-medium">{t.employees.designation}</th>
                    <th className="px-3 py-3 font-medium">{t.employees.role}</th>
                    <th className="px-3 py-3 font-medium">{t.employees.tasks}</th>
                    <th className="px-3 py-3 font-medium">{t.common.status}</th>
                    <th className="px-3 py-3 text-end font-medium">{t.employees.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredEmployees.map((employee) => (
                    <tr key={employee.id} className="align-middle">
                      <td className="px-3 py-4">
                        <div className="font-medium">{employee.name}</div>
                        <div className="mt-1 text-xs text-slate-500">
                          <span dir="ltr">{employee.id}</span> ·{" "}
                          <a
                            dir="ltr"
                            href={`mailto:${employee.email}`}
                            className="hover:text-blue-700 hover:underline"
                          >
                            {employee.email}
                          </a>
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
                          {statusText(employee.status)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-end">
                        <button
                          type="button"
                          onClick={() => setSelectedEmployee(employee)}
                          className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-100"
                        >
                          {t.employees.viewDetails}
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
                      <a
                        href={`mailto:${employee.email}`}
                        className="mt-1 block break-all text-xs text-slate-500 hover:text-blue-700"
                        dir="ltr"
                      >
                        {employee.email}
                      </a>
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
                        {t.employees.assignedTasks(employee.assignedTasks)}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t.employees.statusLine(statusText(employee.status))}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedEmployee(employee)}
                      className="rounded-md border border-slate-200 px-3 py-2 text-xs font-medium"
                    >
                      {t.employees.viewDetails}
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
                  {t.employees.addTitle}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {t.employees.addSubtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={closeForm}
                aria-label={t.employees.closeForm}
                className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <form onSubmit={addEmployee} className="mt-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="employee-name" className="text-sm font-medium">
                    {t.employees.fullName}
                  </label>
                  <input
                    id="employee-name"
                    required
                    maxLength={150}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className={inputClass}
                    placeholder={t.employees.fullNamePlaceholder}
                  />
                </div>

                <div>
                  <label htmlFor="employee-email" className="text-sm font-medium">
                    {`${t.employees.emailAddress} *`}
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
                    {t.employees.phone}
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
                    {`${t.employees.designation} *`}
                  </label>
                  <input
                    id="employee-designation"
                    required
                    maxLength={150}
                    value={designation}
                    onChange={(event) => setDesignation(event.target.value)}
                    className={inputClass}
                    placeholder={t.employees.designationPlaceholder}
                  />
                </div>

                <fieldset>
                  <legend className="text-sm font-medium">{t.employees.roles} *</legend>
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
                    {t.employees.rolesHint}
                  </p>
                </fieldset>

                <div>
                  <label htmlFor="employee-joined-date" className="text-sm font-medium">
                    {t.employees.joiningDate}
                  </label>
                  <input
                    id="employee-joined-date"
                    type="date"
                    value={joinedDate}
                    onChange={(event) => setJoinedDate(event.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="employee-temporary-password" className="text-sm font-medium">
                    {`${t.employees.temporaryPassword} *`}
                  </label>
                  <input
                    id="employee-temporary-password"
                    type="text"
                    required
                    minLength={12}
                    maxLength={128}
                    autoComplete="off"
                    spellCheck={false}
                    aria-describedby="employee-temporary-password-hint"
                    value={temporaryPassword}
                    onChange={(event) => setTemporaryPassword(event.target.value)}
                    className={`${inputClass} font-mono`}
                  />
                  <p id="employee-temporary-password-hint" className="mt-1 text-xs text-slate-500">
                    {t.employees.temporaryPasswordHint}
                  </p>
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
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? t.employees.adding : t.employees.add}
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
                aria-label={t.employees.closeDetails}
                className="rounded-md px-2 py-1 text-lg text-slate-500 hover:bg-slate-100"
              >
                ×
              </button>
            </div>

            <dl className="mt-5 divide-y divide-slate-200 text-sm">
              {[
                [t.employees.detailEmail, selectedEmployee.email],
                [t.employees.detailPhone, selectedEmployee.phone || t.employees.notProvided],
                [
                  t.employees.detailRoles,
                  selectedEmployee.roles.map((r) => r.name).join(", "),
                ],
                [t.employees.detailStatus, statusText(selectedEmployee.status)],
                [t.employees.detailJoined, day(selectedEmployee.joinedDate)],
                [t.employees.detailTasks, String(selectedEmployee.assignedTasks)],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-start justify-between gap-4 py-3"
                >
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="break-all text-end font-medium">
                    {label === t.employees.detailEmail ? (
                      <a
                        href={`mailto:${selectedEmployee.email}`}
                        className="hover:text-blue-700 hover:underline"
                        dir="ltr"
                      >
                        {value}
                      </a>
                    ) : label === t.employees.detailPhone && selectedEmployee.phone ? (
                      <a
                        href={`tel:${selectedEmployee.phone.replace(/[^\d+]/g, "")}`}
                        className="hover:text-blue-700 hover:underline"
                        dir="ltr"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            {can("history.view") && (
              <EntityHistory
                entityType="Employee"
                entityId={String(selectedEmployee.recordId)}
              />
            )}

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setSelectedEmployee(null)}
                className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
              >
                {t.common.close}
              </button>
              {can("employees.deactivate") &&
                selectedEmployee.id !== user?.employeeCode && (
                  <button
                    type="button"
                    onClick={() => void toggleStatus(selectedEmployee.id)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-100"
                  >
                    {selectedEmployee.status === "Active" ? t.employees.markInactive : t.employees.markActive}
                  </button>
                )}
            </div>
          </section>
        </div>
      )}

      <p className="text-xs text-slate-500">
        {t.employees.taskCountsNote}
      </p>
    </div>
  );
}
