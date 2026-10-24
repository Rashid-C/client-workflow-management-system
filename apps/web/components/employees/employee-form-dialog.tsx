"use client";

import { useState, type FormEvent } from "react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import { todayInBrowserTimeZone, type Employee, type Role } from "@/lib/people";
import { labelClass } from "@/components/ui/styles";

const MIN_PASSWORD = 12;

/** Add an employee, or edit `employee` when given. */
export default function EmployeeFormDialog({
  employee,
  roles,
  onClose,
  onSaved,
}: {
  employee?: Employee;
  roles: Role[];
  onClose: () => void;
  onSaved: (employee: Employee) => void;
}) {
  const { user } = useCurrentUser();
  const { t, errorText } = useI18n();
  const e = t.employees;
  const editingSelf = Boolean(employee && employee.id === user?.employeeId);

  const [name, setName] = useState(employee?.name ?? "");
  const [email, setEmail] = useState(employee?.email ?? "");
  const [phone, setPhone] = useState(employee?.phone ?? "");
  const [designation, setDesignation] = useState(employee?.designation ?? "");
  const [joinedDate, setJoinedDate] = useState(employee?.joinedDate ?? todayInBrowserTimeZone());
  const [roleIds, setRoleIds] = useState<number[]>(
    () => employee?.roles.map((role) => role.id) ?? roles.filter((role) => role.name === "Staff").map((role) => role.id),
  );
  const [temporaryPassword, setTemporaryPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!roleIds.length) return setError(e.needRole);
    if (!employee && temporaryPassword.length < MIN_PASSWORD) return setError(e.passwordTooShort);

    setSaving(true);
    setError("");
    const details = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      designation: designation.trim(),
      joinedDate,
      roleIds,
    };
    try {
      onSaved(
        employee
          ? await api<Employee>(`/employees/${encodeURIComponent(employee.employeeCode)}`, {
              method: "PATCH",
              body: JSON.stringify({ ...details, version: employee.version }),
            })
          : await api<Employee>("/employees", {
              method: "POST",
              body: JSON.stringify({ ...details, status: "Active", temporaryPassword }),
            }),
      );
    } catch (err) {
      setError(errorText(err, employee ? e.unableToSave : e.unableToCreate));
      setSaving(false);
    }
  }

  const label = (id: string, text: string) => (
    <label htmlFor={id} className={labelClass}>{text}</label>
  );

  return (
    <Modal
      wide
      title={employee ? e.editTitle : e.addTitle}
      subtitle={employee ? `${employee.name} · ${employee.employeeCode}` : e.addSubtitle}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className={secondaryButton}>{t.common.cancel}</button>
          <button type="submit" form="employee-form" disabled={saving} className={primaryButton}>
            {saving ? e.adding : employee ? t.common.save : e.add}
          </button>
        </>
      }
    >
      <form id="employee-form" onSubmit={save} className="space-y-4">
        {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            {label("employee-name", `${e.fullName} *`)}
            <input id="employee-name" required maxLength={150} value={name} onChange={(ev) => setName(ev.target.value)} placeholder={e.fullNamePlaceholder} className={inputClass} />
          </div>
          <div>
            {label("employee-email", `${e.emailAddress} *`)}
            <input id="employee-email" required type="email" dir="ltr" maxLength={254} value={email} onChange={(ev) => setEmail(ev.target.value)} placeholder="name@alfathuae.com" className={inputClass} />
          </div>
          <div>
            {label("employee-phone", e.phone)}
            <input id="employee-phone" type="tel" dir="ltr" maxLength={30} value={phone} onChange={(ev) => setPhone(ev.target.value)} placeholder="+971 …" className={inputClass} />
          </div>
          <div>
            {label("employee-designation", `${e.designation} *`)}
            <input id="employee-designation" required maxLength={150} value={designation} onChange={(ev) => setDesignation(ev.target.value)} placeholder={e.designationPlaceholder} className={inputClass} />
          </div>
          <div>
            {label("employee-joined", e.joiningDate)}
            <input id="employee-joined" type="date" required value={joinedDate} onChange={(ev) => setJoinedDate(ev.target.value)} className={inputClass} />
          </div>

          <fieldset className="sm:row-span-2">
            <legend className="text-sm font-medium text-slate-800">{e.roles} *</legend>
            <div className="mt-1.5 space-y-2 rounded-lg border border-slate-200 p-3">
              {roles.map((role) => {
                // The API enforces both rules; this only explains them up front.
                const locked = editingSelf || (role.isSystem && !user?.isSuperAdmin);
                return (
                  <label key={role.id} className={`flex items-start gap-2 text-sm ${locked ? "opacity-60" : ""}`}>
                    <input
                      type="checkbox"
                      checked={roleIds.includes(role.id)}
                      disabled={locked}
                      onChange={(ev) =>
                        setRoleIds((current) =>
                          ev.target.checked ? [...current, role.id] : current.filter((id) => id !== role.id),
                        )
                      }
                      className="mt-0.5 accent-brand-600"
                    />
                    <span>
                      <span className="font-medium">{role.name}</span>
                      {role.description && <span className="block text-xs text-slate-500">{role.description}</span>}
                      {role.isSystem && !user?.isSuperAdmin && <span className="block text-xs text-slate-500">{e.superAdminRoleHint}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">{editingSelf ? e.ownRolesHint : e.rolesHint}</p>
          </fieldset>

          {!employee && (
            <div className="sm:col-span-2">
              {label("employee-password", `${e.temporaryPassword} *`)}
              <input
                id="employee-password"
                type="text"
                required
                minLength={MIN_PASSWORD}
                maxLength={128}
                autoComplete="off"
                spellCheck={false}
                dir="ltr"
                aria-describedby="employee-password-hint"
                value={temporaryPassword}
                onChange={(ev) => setTemporaryPassword(ev.target.value)}
                className={`${inputClass} font-mono`}
              />
              <p id="employee-password-hint" className="mt-1 text-xs text-slate-500">{e.temporaryPasswordHint}</p>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}
