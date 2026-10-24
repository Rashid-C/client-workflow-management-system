"use client";

import { useEffect, useMemo, useState } from "react";
import { KeyRound, Lock, Plus } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import EmployeeFormDialog from "@/components/employees/employee-form-dialog";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link, { useRouter } from "@/components/i18n/link";
import { inputClass, primaryButton } from "@/components/ui/modal";
import Badge from "@/components/ui/badge";
import StatCard from "@/components/ui/stat-card";
import { api, ApiError } from "@/lib/api";
import { roleStyle, type Employee, type Role } from "@/lib/people";

export default function EmployeeList() {
  const router = useRouter();
  const { can } = useCurrentUser();
  const { t, errorText } = useI18n();
  const e = t.employees;
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [creating, setCreating] = useState(false);

  // State changes only once the requests answer, never synchronously in the effect.
  function load(signal?: AbortSignal) {
    return Promise.all([
      api<Employee[]>("/employees", { signal }),
      // Without roles.view the role filter and form simply stay empty.
      api<Role[]>("/roles", { signal }).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 403) return [];
        throw err;
      }),
    ])
      .then(([people, roleList]) => {
        setEmployees(people);
        setRoles(roleList);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(errorText(err, e.unableToLoad));
      })
      .finally(() => {
        if (!signal?.aborted) setLoading(false);
      });
  }

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once on mount
  }, []);

  const stats = useMemo(
    () => [
      { label: e.statTotal, value: employees.length, note: e.statTotalNote },
      { label: e.statActive, value: employees.filter((p) => p.status === "Active").length, note: e.statActiveNote },
      { label: e.statInactive, value: employees.filter((p) => p.status === "Inactive").length, note: e.statInactiveNote },
      {
        label: e.statManagers,
        value: employees.filter((p) => p.roles.some((r) => r.isSystem || r.name === "Manager")).length,
        note: e.statManagersNote,
      },
    ],
    [employees, e],
  );

  const shown = useMemo(() => {
    const query = search.trim().toLowerCase();
    return employees.filter((person) => {
      if (roleFilter && !person.roles.some((role) => String(role.id) === roleFilter)) return false;
      if (statusFilter && person.status !== statusFilter) return false;
      return [person.employeeCode, person.name, person.email, person.phone ?? "", person.designation].some((value) =>
        value.toLowerCase().includes(query),
      );
    });
  }, [employees, search, roleFilter, statusFilter]);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={loading ? "–" : stat.value} hint={stat.note} />
        ))}
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="flex-1">
            <label htmlFor="employee-search" className="text-sm font-medium">{t.common.search}</label>
            <input id="employee-search" type="search" value={search} onChange={(ev) => setSearch(ev.target.value)} placeholder={e.searchPlaceholder} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            <div>
              <label htmlFor="employee-role" className="text-sm font-medium">{e.role}</label>
              <select id="employee-role" value={roleFilter} onChange={(ev) => setRoleFilter(ev.target.value)} className={inputClass}>
                <option value="">{e.allRoles}</option>
                {roles.map((role) => <option key={role.id} value={String(role.id)}>{role.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="employee-status" className="text-sm font-medium">{t.common.status}</label>
              <select id="employee-status" value={statusFilter} onChange={(ev) => setStatusFilter(ev.target.value)} className={inputClass}>
                <option value="">{e.allStatuses}</option>
                <option value="Active">{e.active}</option>
                <option value="Inactive">{e.inactive}</option>
              </select>
            </div>
          </div>
          {can("employees.create") && (
            <button type="button" onClick={() => setCreating(true)} className={`${primaryButton} inline-flex items-center justify-center gap-1.5`}>
              <Plus size={16} aria-hidden="true" /> {e.add}
            </button>
          )}
        </div>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p role="alert" className="text-sm text-red-700">{error}</p>
            <button type="button" onClick={() => {
                setError("");
                setLoading(true);
                void load();
              }} className="mt-3 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
              {e.tryAgain}
            </button>
          </div>
        ) : loading ? (
          <p role="status" className="py-8 text-center text-sm text-slate-500">{e.loading}</p>
        ) : shown.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 px-4 py-12 text-center">
            <p className="font-medium">{e.noneFound}</p>
            <p className="mt-1 text-sm text-slate-500">{e.noneFoundHint}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-start text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 text-start font-medium">{e.employee}</th>
                  <th className="px-3 py-3 text-start font-medium">{e.designation}</th>
                  <th className="px-3 py-3 text-start font-medium">{e.roles}</th>
                  <th className="px-3 py-3 text-start font-medium">{e.openStages}</th>
                  <th className="px-3 py-3 text-start font-medium">{t.common.status}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {shown.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50">
                    <td className="px-3 py-3">
                      <Link href={`/employees/${encodeURIComponent(person.employeeCode)}`} className="font-medium text-slate-900 hover:text-brand-700 hover:underline">
                        {person.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span dir="ltr">{person.employeeCode}</span> · <span dir="ltr">{person.email}</span>
                      </p>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{person.designation}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {person.roles.map((role) => (
                          <span key={role.id} className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${roleStyle(role)}`}>{role.name}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{person.openStages || t.common.none}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={person.status === "Active" ? "success" : "neutral"}>
                          {person.status === "Active" ? e.active : e.inactive}
                        </Badge>
                        {person.isLocked && (
                          <Badge tone="danger">
                            <Lock size={11} aria-hidden="true" /> {e.locked}
                          </Badge>
                        )}
                        {person.mustChangePassword && (
                          <Badge tone="warning">
                            <KeyRound size={11} aria-hidden="true" /> {e.tempPassword}
                          </Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-slate-500">{e.count(shown.length, employees.length)}</p>
          </div>
        )}
      </section>

      {creating && (
        <EmployeeFormDialog
          roles={roles}
          onClose={() => setCreating(false)}
          onSaved={(person) => router.push(`/employees/${encodeURIComponent(person.employeeCode)}`)}
        />
      )}
    </div>
  );
}
