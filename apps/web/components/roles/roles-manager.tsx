"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/components/auth/current-user";
import { useI18n } from "@/components/i18n/i18n-provider";
import { inputClass, primaryButton, secondaryButton } from "@/components/ui/modal";
import { api } from "@/lib/api";
import type { PermissionInfo, PermissionScope, Role } from "@/lib/people";

type Draft = { name: string; description: string; grants: Map<string, PermissionScope> };

const draftOf = (role?: Role): Draft => ({
  name: role?.name ?? "",
  description: role?.description ?? "",
  grants: new Map(role?.permissions.map((g) => [g.key, g.scope]) ?? []),
});

export default function RolesManager() {
  const { can } = useCurrentUser();
  const { t, errorText } = useI18n();
  const r = t.roles;
  const labels = t.permissions.labels as Record<string, { label: string; hint: string } | undefined>;
  const categories = t.permissions.categories as Record<string, string | undefined>;
  const canManage = can("roles.manage");

  const [roles, setRoles] = useState<Role[]>([]);
  const [catalogue, setCatalogue] = useState<PermissionInfo[]>([]);
  const [selected, setSelected] = useState<number | "new" | null>(null);
  const [draft, setDraft] = useState<Draft>(draftOf());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      api<Role[]>("/roles", { signal: controller.signal }),
      api<PermissionInfo[]>("/roles/permissions", { signal: controller.signal }),
    ])
      .then(([roleList, permissions]) => {
        setRoles(roleList);
        setCatalogue(permissions);
        const first = roleList.find((role) => !role.isSystem) ?? roleList[0];
        if (first) {
          setSelected(first.id);
          setDraft(draftOf(first));
        }
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setError(errorText(err, r.unableToLoad));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once; t is stable per language
  }, []);

  const role = typeof selected === "number" ? roles.find((item) => item.id === selected) : undefined;
  const readOnly = !canManage || Boolean(role?.isSystem);

  const groups = useMemo(() => {
    const byCategory = new Map<string, PermissionInfo[]>();
    for (const permission of catalogue) {
      byCategory.set(permission.category, [...(byCategory.get(permission.category) ?? []), permission]);
    }
    return [...byCategory.entries()];
  }, [catalogue]);

  function choose(next: number | "new") {
    setSelected(next);
    setDraft(draftOf(next === "new" ? undefined : roles.find((item) => item.id === next)));
    setError("");
    setNotice("");
  }

  function toggle(permission: PermissionInfo, on: boolean) {
    setDraft((current) => {
      const grants = new Map(current.grants);
      if (on) grants.set(permission.key, permission.scoped ? "own" : "all");
      else grants.delete(permission.key);
      return { ...current, grants };
    });
  }

  function setScope(key: string, scope: PermissionScope) {
    setDraft((current) => ({ ...current, grants: new Map(current.grants).set(key, scope) }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return setError(r.nameRequired);
    setSaving(true);
    setError("");
    setNotice("");
    const body = {
      name: draft.name,
      description: draft.description,
      permissions: [...draft.grants].map(([key, scope]) => ({ key, scope })),
    };
    try {
      const saved = role
        ? await api<Role>(`/roles/${role.id}`, { method: "PATCH", body: JSON.stringify({ ...body, version: role.version }) })
        : await api<Role>("/roles", { method: "POST", body: JSON.stringify(body) });
      setRoles((current) =>
        role ? current.map((item) => (item.id === saved.id ? saved : item)) : [...current, saved],
      );
      setSelected(saved.id);
      setDraft(draftOf(saved));
      setNotice(r.saved(saved.name));
    } catch (err) {
      setError(errorText(err, r.unableToSave));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!role || !window.confirm(r.confirmDelete(role.name))) return;
    setSaving(true);
    setError("");
    try {
      await api<void>(`/roles/${role.id}`, { method: "DELETE" });
      const rest = roles.filter((item) => item.id !== role.id);
      setRoles(rest);
      const next = rest.find((item) => !item.isSystem) ?? rest[0];
      setSelected(next?.id ?? null);
      setDraft(draftOf(next));
      setNotice(r.deleted(role.name));
    } catch (err) {
      setError(errorText(err, r.unableToDelete));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p role="status" className="py-8 text-sm text-slate-500">{r.loading}</p>;
  if (!roles.length && error) return <p role="alert" className="py-4 text-sm text-red-700">{error}</p>;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[18rem_1fr]">
      <aside className="space-y-3">
        {canManage && (
          <button type="button" onClick={() => choose("new")} className={`${primaryButton} inline-flex w-full items-center justify-center gap-1.5`}>
            <Plus size={16} aria-hidden="true" /> {r.newRole}
          </button>
        )}
        <ul className="space-y-2">
          {roles.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => choose(item.id)}
                aria-current={selected === item.id ? "true" : undefined}
                className={`w-full rounded-xl border p-3 text-start transition ${
                  selected === item.id ? "border-brand-500 bg-brand-50" : "border-slate-200 bg-white hover:bg-slate-50"
                }`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">{item.name}</span>
                  {item.isSystem && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-medium text-purple-700">
                      <Lock size={10} aria-hidden="true" /> {r.system}
                    </span>
                  )}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {r.members(item.memberCount)} · {r.permissionCount(item.permissions.length)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {selected !== null && (
        <form onSubmit={save} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
          {role?.isSystem && <p className="rounded-lg border border-purple-200 bg-purple-50 px-4 py-3 text-sm text-purple-800">{r.systemNote}</p>}
          {!canManage && !role?.isSystem && <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">{r.viewOnly}</p>}
          {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p>}
          {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="role-name" className="text-sm font-medium">{r.name}</label>
              <input id="role-name" required maxLength={60} disabled={readOnly} value={draft.name} onChange={(ev) => setDraft({ ...draft, name: ev.target.value })} className={inputClass} />
            </div>
            <div>
              <label htmlFor="role-description" className="text-sm font-medium">{r.description}</label>
              <input id="role-description" maxLength={300} disabled={readOnly} value={draft.description} onChange={(ev) => setDraft({ ...draft, description: ev.target.value })} className={inputClass} />
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold">{r.permissions}</h2>
            <p className="mt-1 text-xs text-slate-500">{r.scopeHint}</p>
            <div className="mt-3 space-y-4">
              {groups.map(([category, permissions]) => (
                <fieldset key={category} className="rounded-lg border border-slate-200">
                  <legend className="sr-only">{categories[category] ?? category}</legend>
                  <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <span aria-hidden="true">{categories[category] ?? category}</span>
                    <span dir="ltr">{permissions.filter((p) => draft.grants.has(p.key)).length}/{permissions.length}</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {permissions.map((permission) => {
                      const text = labels[permission.key];
                      const scope = draft.grants.get(permission.key);
                      const id = `perm-${permission.key}`;
                      return (
                        <li key={permission.key} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
                          <label htmlFor={id} className="flex items-start gap-2.5 text-sm">
                            <input id={id} type="checkbox" checked={Boolean(scope)} disabled={readOnly} onChange={(ev) => toggle(permission, ev.target.checked)} className="mt-0.5 accent-brand-600" />
                            <span>
                              <span className="font-medium text-slate-900">{text?.label ?? permission.key}</span>
                              {text?.hint && <span className="block text-xs text-slate-500">{text.hint}</span>}
                            </span>
                          </label>
                          {permission.scoped && scope && (
                            <select
                              aria-label={r.scopeLabel(text?.label ?? permission.key)}
                              value={scope}
                              disabled={readOnly}
                              onChange={(ev) => setScope(permission.key, ev.target.value as PermissionScope)}
                              className="ms-7 w-40 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs sm:ms-0"
                            >
                              <option value="own">{r.scopeOwn}</option>
                              <option value="all">{r.scopeAll}</option>
                            </select>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
              ))}
            </div>
          </div>

          {!readOnly && (
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                {role && (
                  role.memberCount ? (
                    <p className="text-xs text-slate-500">{r.inUse(role.memberCount)}</p>
                  ) : (
                    <button type="button" onClick={() => void remove()} disabled={saving} className={`${secondaryButton} inline-flex items-center gap-1.5 text-red-700`}>
                      <Trash2 size={14} aria-hidden="true" /> {r.deleteRole}
                    </button>
                  )
                )}
              </div>
              <button type="submit" disabled={saving} className={primaryButton}>{saving ? t.common.saving : t.common.save}</button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
