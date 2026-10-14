"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { ApiError, type ErrorParams } from "@/lib/api";
import { ar } from "@/lib/i18n/ar";
import {
  directionOf,
  intlLocale,
  LOCALE_COOKIE,
  withLocale,
  withoutLocale,
  type Locale,
} from "@/lib/i18n/config";
import { en, type Dictionary } from "@/lib/i18n/en";

// Office time, whatever time zone the viewer's computer is set to.
const OFFICE_TIME_ZONE = "Asia/Dubai";

type I18n = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: Dictionary;
  /** 75 → "1h 15m" / "1 س 15 د". */
  minutes: (minutes: number) => string;
  /** A calendar day "2026-10-08" → "8 Oct 2026", with no time zone shift. */
  day: (day: string) => string;
  /** An instant, in office time: "13 Oct 2026, 14:05". */
  dateTime: (iso: string) => string;
  status: (status: keyof Dictionary["status"]) => string;
  action: (action: string) => string;
  /**
   * What went wrong, in this language: the message for the server's error
   * code, else one for the HTTP status, else `fallback`.
   */
  errorText: (error: unknown, fallback: string) => string;
  /** Save the choice, then reload the same page in that language. */
  switchTo: (locale: Locale) => Promise<void>;
};

const I18nContext = createContext<I18n | null>(null);

export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo<I18n>(() => {
    const t = locale === "ar" ? ar : en;
    const dayFormat = new Intl.DateTimeFormat(intlLocale(locale), {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
    const dateTimeFormat = new Intl.DateTimeFormat(intlLocale(locale), {
      timeZone: OFFICE_TIME_ZONE,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Params arrive raw; show them the way the rest of the page does.
    const formatParams = (params: ErrorParams): Record<string, string> =>
      Object.fromEntries(
        Object.entries(params).map(([key, value]) => {
          if (key.endsWith("Minutes") && typeof value === "number") return [key, minutes(value)];
          if (key === "day" && typeof value === "string") return [key, day(value)];
          if (key === "status" && typeof value === "string") {
            return [key, (t.status as Record<string, string>)[value] ?? value];
          }
          return [key, String(value)];
        }),
      );
    const minutes = (total: number) => {
      const h = Math.floor(total / 60);
      const m = total % 60;
      if (!h) return t.duration.minutes(m);
      return m ? t.duration.hoursMinutes(h, m) : t.duration.hours(h);
    };
    const day = (value: string) => dayFormat.format(new Date(`${value}T00:00:00Z`));

    return {
      locale,
      dir: directionOf(locale),
      t,
      minutes,
      day,
      dateTime: (iso) => dateTimeFormat.format(new Date(iso)),
      status: (status) => t.status[status] ?? status,
      action: (action) =>
        (t.activity.actions as Record<string, string>)[action] ?? action,
      errorText: (error, fallback) => {
        if (!(error instanceof ApiError)) return fallback;

        const entry = error.code ? codeMessages(t)[error.code] : undefined;
        if (typeof entry === "string") return entry;
        if (entry) return entry(formatParams(error.params ?? {}));

        if (error.status === 0) return t.errors.network;
        if (error.status >= 500) return t.errors.server;
        // An English reader can have the server's own sentence; it is
        // usually more specific than a message chosen by status.
        if (locale === "en" && error.message) return error.message;
        return statusMessage(t, error.status) ?? fallback;
      },
      switchTo: async (next) => {
        // A year, so the proxy remembers the choice on this computer.
        document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
        await fetch("/api/v1/auth/me/language", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language: next }),
        }).catch(() => {});
        const { pathname, search, hash } = window.location;
        // Full reload so <html lang/dir> and every server part switch too.
        window.location.assign(withLocale(next, withoutLocale(pathname)) + search + hash);
      },
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

type CodeMessage = string | ((params: Record<string, string>) => string);

// The code comes from the server, so the params it brings are only known at
// run time; each message reads just the names it declares.
const codeMessages = (t: Dictionary) =>
  t.errors.codes as unknown as Record<string, CodeMessage | undefined>;

function statusMessage(t: Dictionary, status: number): string | undefined {
  switch (status) {
    case 401:
      return t.errors.signIn;
    case 403:
      return t.errors.forbidden;
    case 404:
      return t.errors.notFound;
    case 409:
      return t.errors.conflict;
    case 429:
      return t.errors.tooMany;
  }
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
