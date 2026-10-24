"use client";

import { useState } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { api, safeNextPath, type CurrentUser } from "@/lib/api";
import { withLocale } from "@/lib/i18n/config";
import { alertClass, labelClass } from "@/components/ui/styles";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-brand-500";

export default function LoginForm() {
  const { t, errorText } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function signIn(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const user = await api<CurrentUser>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: email.trim(), password }),
      });

      // Continue in the person's saved language, wherever they signed in.
      const language = user.preferredLanguage;
      const next = safeNextPath(new URLSearchParams(window.location.search).get("next"));
      window.location.assign(
        withLocale(
          language,
          user.mustChangePassword ? `/change-password?next=${encodeURIComponent(next)}` : next,
        ),
      );
    } catch (err) {
      setError(errorText(err, t.auth.unableToSignIn));
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={signIn} className="space-y-4" noValidate>
      <div>
        <label htmlFor="login-email" className={labelClass}>
          {t.auth.email}
        </label>
        <input
          id="login-email"
          type="email"
          dir="ltr"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="login-password" className={labelClass}>
          {t.auth.password}
        </label>
        <input
          id="login-password"
          type="password"
          dir="ltr"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
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
        disabled={submitting || !email || !password}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {submitting ? t.auth.signingIn : t.auth.signIn}
      </button>
    </form>
  );
}
