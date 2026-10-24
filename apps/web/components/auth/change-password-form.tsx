"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { api, safeNextPath } from "@/lib/api";
import { withLocale } from "@/lib/i18n/config";
import { alertClass, labelClass } from "@/components/ui/styles";

const MIN_LENGTH = 12;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500";

export default function ChangePasswordForm() {
  const { t, locale, errorText } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < MIN_LENGTH) {
      setError(t.auth.tooShort(MIN_LENGTH));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t.auth.mismatch);
      return;
    }

    setSubmitting(true);
    try {
      await api<void>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      window.location.assign(
        withLocale(locale, safeNextPath(new URLSearchParams(window.location.search).get("next"))),
      );
    } catch (err) {
      setError(errorText(err, t.auth.unableToChange));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={changePassword} className="space-y-4" noValidate>
      <div>
        <label htmlFor="current-password" className={labelClass}>
          {t.auth.currentPassword}
        </label>
        <input
          id="current-password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="new-password" className={labelClass}>
          {t.auth.newPassword}
        </label>
        <input
          id="new-password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          aria-describedby="new-password-hint"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={inputClass}
        />
        <p id="new-password-hint" className="mt-1 text-xs text-slate-500">
          {t.auth.newPasswordHint(MIN_LENGTH)}
        </p>
      </div>

      <div>
        <label htmlFor="confirm-password" className={labelClass}>
          {t.auth.repeatPassword}
        </label>
        <input
          id="confirm-password"
          type="password"
          dir="ltr"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className={alertClass}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !currentPassword || !newPassword}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? t.common.saving : t.auth.changePassword}
      </button>
    </form>
  );
}
