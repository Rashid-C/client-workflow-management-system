"use client";

import { useState } from "react";
import { api, safeNextPath } from "@/lib/api";

const MIN_LENGTH = 12;

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500";

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (newPassword.length < MIN_LENGTH) {
      setError(`Use at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await api<void>("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      window.location.assign(
        safeNextPath(new URLSearchParams(window.location.search).get("next")),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to change password.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={changePassword} className="space-y-4" noValidate>
      <div>
        <label htmlFor="current-password" className="text-sm font-medium">
          Current or temporary password
        </label>
        <input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="new-password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          autoComplete="new-password"
          aria-describedby="new-password-hint"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className={inputClass}
        />
        <p id="new-password-hint" className="mt-1 text-xs text-slate-500">
          At least {MIN_LENGTH} characters. A short sentence is easy to remember.
        </p>
      </div>

      <div>
        <label htmlFor="confirm-password" className="text-sm font-medium">
          Repeat new password
        </label>
        <input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className={inputClass}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting || !currentPassword || !newPassword}
        className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}
