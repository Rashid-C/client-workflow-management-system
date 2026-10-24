"use client";

import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, Pencil, Power } from "lucide-react";
import EntityHistory from "@/components/audit/entity-history";
import { useCurrentUser } from "@/components/auth/current-user";
import EmployeeFormDialog from "@/components/employees/employee-form-dialog";
import { useI18n } from "@/components/i18n/i18n-provider";
import Link from "@/components/i18n/link";
import Modal, { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api, ApiError } from "@/lib/api";
import { isSuperAdmin, roleStyle, type Employee, type Role } from "@/lib/people";
import { DetailHeader, Page } from "@/components/ui/page";
import { buttonClass, labelClass } from "@/components/ui/styles";
import Badge from "@/components/ui/badge";

export default function EmployeeView({ employeeCode }: { employeeCode: string }) {
  const { user, can } = useCurrentUser();
  const { t, day, errorText } = useI18n();
  const e = t.employees;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const path = `/employees/${encodeURIComponent(employeeCode)}`;

  useEffect(() => {
    const controller = new AbortController();
    api<Employee>(path, { signal: controller.signal })
      .then(setEmployee)
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(err instanceof ApiError && err.status === 404 ? e.notFound : errorText(err, e.unableToLoadOne));
      });
    if (can("employees.edit")) {
      api<Role[]>("/roles", { signal: controller.signal }).then(setRoles).catch(() => {});
    }
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable per language
  }, [path]);

  function updated(next: Employee, message = "") {
    setEmployee(next);
    setEditing(false);
    setResetting(false);
    setActionError("");
    setNotice(message);
    setHistoryKey((key) => key + 1);
  }

  async function toggleStatus(current: Employee) {
    const next = current.status === "Active" ? "Inactive" : "Active";
    if (next === "Inactive" && !window.confirm(e.deactivateConfirm(current.name))) return;
    setBusy(true);
    try {
      const saved = await api<Employee>(`${path}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      updated(saved, e.marked(saved.name, saved.status === "Active" ? e.active : e.inactive));
    } catch (err) {
      setActionError(errorText(err, e.unableToUpdate));
    } finally {
      setBusy(false);
    }
  }

  if (error) {
    return (
      <div className="p-6">
        <p role="alert" className="text-sm text-red-700">{error}</p>
        <Link href="/employees" className="mt-3 inline-block text-sm text-brand-700 hover:underline">{e.back}</Link>
      </div>
    );
  }
  if (!employee) return <p role="status" className="p-6 text-sm text-slate-500">{e.loadingOne}</p>;

  const self = employee.id === user?.employeeId;
  // A Super Admin account is managed only by a Super Admin (the API enforces it).
  const manageable = !isSuperAdmin(employee) || Boolean(user?.isSuperAdmin);
  const none = <span className="text-slate-400">{e.notProvided}</span>;

  return (
    <Page size="narrow" className="space-y-6">
      <DetailHeader
        backHref="/employees"
        backLabel={e.back}
        meta={<>
          <span className="text-slate-400" dir="ltr">{employee.employeeCode}</span>
          <Badge tone={employee.status === "Active" ? "success" : "neutral"}>{employee.status === "Active" ? e.active : e.inactive}</Badge>
        </>}
        title={employee.name}
        subtitle={employee.designation}
        actions={manageable && <>
          {can("employees.edit") && (
            <button type="button" onClick={() => setEditing(true)} disabled={!roles.length} className={buttonClass("secondary", "sm")}>
              <Pencil size={14} aria-hidden="true" /> {e.edit}
            </button>
          )}
          {can("employees.edit") && !self && (
            <button type="button" onClick={() => setResetting(true)} className={buttonClass("secondary", "sm")}>
              <KeyRound size={14} aria-hidden="true" /> {e.resetPassword}
            </button>
          )}
          {can("employees.deactivate") && !self && (
            <button type="button" onClick={() => void toggleStatus(employee)} disabled={busy} className={buttonClass("secondary", "sm")}>
              <Power size={14} aria-hidden="true" /> {employee.status === "Active" ? e.markInactive : e.markActive}
            </button>
          )}
        </>}
      />

      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
      {actionError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</p>}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title={e.sections.details}>
          <Fact label={e.detailCode}><span dir="ltr">{employee.employeeCode}</span></Fact>
          <Fact label={e.detailEmail}>
            <a href={`mailto:${employee.email}`} dir="ltr" className="text-brand-700 hover:underline">{employee.email}</a>
          </Fact>
          <Fact label={e.detailPhone}>
            {employee.phone ? <a href={`tel:${employee.phone.replace(/[^\d+]/g, "")}`} dir="ltr" className="text-brand-700 hover:underline">{employee.phone}</a> : none}
          </Fact>
          <Fact label={e.detailJoined}>{day(employee.joinedDate)}</Fact>
          <Fact label={e.openStages}>{e.openStagesCount(employee.openStages)}</Fact>
        </Card>

        <Card title={e.sections.access}>
          <Fact label={e.detailRoles}>
            <div className="flex flex-wrap gap-1">
              {employee.roles.map((role) => (
                <span key={role.id} className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${roleStyle(role)}`}>{role.name}</span>
              ))}
            </div>
          </Fact>
          <Fact label={e.detailStatus}>{employee.status === "Active" ? e.active : e.inactive}</Fact>
          <Fact label={e.detailSignIn}>
            {employee.isLocked ? <span className="text-red-700">{e.locked}</span> : employee.mustChangePassword ? <span className="text-amber-800">{e.tempPassword}</span> : e.signInNormal}
          </Fact>
        </Card>
      </div>

      {can("history.view") && (
        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <EntityHistory key={historyKey} entityType="Employee" entityId={String(employee.id)} />
        </section>
      )}

      {editing && (
        <EmployeeFormDialog employee={employee} roles={roles} onClose={() => setEditing(false)} onSaved={(saved) => updated(saved, e.saved(saved.name))} />
      )}
      {resetting && (
        <ResetPasswordDialog employee={employee} path={path} onClose={() => setResetting(false)} onDone={(saved) => updated(saved, e.resetDone(saved.name))} />
      )}
    </Page>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,9rem)_1fr] gap-3 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="min-w-0 wrap-break-word text-slate-900">{children}</dd>
    </div>
  );
}

function ResetPasswordDialog({
  employee,
  path,
  onClose,
  onDone,
}: {
  employee: Employee;
  path: string;
  onClose: () => void;
  onDone: (employee: Employee) => void;
}) {
  const { t, errorText } = useI18n();
  const e = t.employees;
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function issue() {
    if (password.length < 12) return setError(e.passwordTooShort);
    setBusy(true);
    setError("");
    try {
      onDone(await api<Employee>(`${path}/reset-password`, { method: "POST", body: JSON.stringify({ temporaryPassword: password }) }));
    } catch (err) {
      setError(errorText(err, e.unableToUpdate));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={e.resetTitle(employee.name)}
      onClose={onClose}
      footer={
        <>
          <button type="button" onClick={onClose} className={secondaryButton}>{t.common.cancel}</button>
          <button type="button" onClick={() => void issue()} disabled={busy} className={primaryButton}>{e.issue}</button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{e.resetHint}</p>
      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div>
        <label htmlFor="reset-password" className={labelClass}>{e.temporaryPassword}</label>
        <input
          id="reset-password"
          type="text"
          minLength={12}
          maxLength={128}
          autoComplete="off"
          spellCheck={false}
          dir="ltr"
          value={password}
          onChange={(ev) => setPassword(ev.target.value)}
          className={`${inputClass} font-mono`}
        />
        <p className="mt-1 text-xs text-slate-500">{e.temporaryPasswordHint}</p>
      </div>
    </Modal>
  );
}
