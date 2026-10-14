"use client";

import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import { useMemo, type ComponentProps } from "react";
import { useI18n } from "@/components/i18n/i18n-provider";
import { withLocale } from "@/lib/i18n/config";

/**
 * next/link that keeps the current language: href="/tasks" goes to
 * "/ar/tasks" on an Arabic page. Use this instead of next/link everywhere.
 */
export default function Link({ href, ...props }: ComponentProps<typeof NextLink>) {
  const { locale } = useI18n();
  return <NextLink href={typeof href === "string" ? withLocale(locale, href) : href} {...props} />;
}

/** useRouter whose push/replace keep the current language. */
export function useRouter() {
  const router = useNextRouter();
  const { locale } = useI18n();
  return useMemo(
    () => ({
      ...router,
      push: (path: string) => router.push(withLocale(locale, path)),
      replace: (path: string) => router.replace(withLocale(locale, path)),
    }),
    [router, locale],
  );
}
