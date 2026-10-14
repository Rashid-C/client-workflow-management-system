import { ar } from "./ar";
import { isLocale, type Locale } from "./config";
import { en, type Dictionary } from "./en";

/** For server components and metadata, which know the lang param. */
export function dictionaryFor(lang: string): Dictionary {
  const locale: Locale = isLocale(lang) ? lang : "en";
  return locale === "ar" ? ar : en;
}
