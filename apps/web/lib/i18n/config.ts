export const LOCALES = ["en", "ar"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

/** Mirrors the signed-in person's saved choice so the proxy can route to it. */
export const LOCALE_COOKIE = "tw_lang";

export const isLocale = (value: string | undefined | null): value is Locale =>
  (LOCALES as readonly string[]).includes(value ?? "");

export const directionOf = (locale: Locale) => (locale === "ar" ? "rtl" : "ltr");

/**
 * Intl locale for dates and numbers. Arabic keeps Western digits (0-9), as
 * agreed for the office; dates follow ar-AE otherwise.
 */
export const intlLocale = (locale: Locale) => (locale === "ar" ? "ar-AE-u-nu-latn" : "en-GB");

/** "/tasks" → "/ar/tasks"; leaves external and already-prefixed paths alone. */
export function withLocale(locale: Locale, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const first = path.split(/[/?#]/)[1];
  if (isLocale(first)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** "/ar/tasks/4" → "/tasks/4". */
export function withoutLocale(pathname: string): string {
  const first = pathname.split("/")[1];
  if (!isLocale(first)) return pathname;
  const rest = pathname.slice(first.length + 1);
  return rest === "" ? "/" : rest;
}

/** The locale of the page currently shown, from <html lang>. Browser only. */
export function currentLocale(): Locale {
  const lang = typeof document === "undefined" ? null : document.documentElement.lang;
  return isLocale(lang) ? lang : DEFAULT_LOCALE;
}
