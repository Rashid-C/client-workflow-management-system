import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  withoutLocale,
  type Locale,
} from "@/lib/i18n/config";

const SESSION_COOKIE = "tw_session";
// Keep in sync with workspace pages so unknown URLs reach the localized 404.
const WORKSPACE_PATHS = [
  "/activity",
  "/change-password",
  "/clients",
  "/daily-updates",
  "/documents",
  "/employees",
  "/leads",
  "/my-work",
  "/overview",
  "/roles",
  "/settings",
  "/task-types",
  "/tasks",
  "/time-logs",
] as const;

function isWorkspacePath(path: string): boolean {
  return WORKSPACE_PATHS.some((base) => path === base || path.startsWith(`${base}/`));
}

/** The saved choice, else the browser's languages, else English. */
function preferredLocale(request: NextRequest): Locale {
  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(saved)) return saved;
  const accepted = request.headers.get("accept-language") ?? "";
  const first = accepted.split(",")[0]?.trim().toLowerCase() ?? "";
  return first.startsWith("ar") ? "ar" : DEFAULT_LOCALE;
}

/**
 * 1. Put every page under a language: /tasks → /ar/tasks.
 * 2. Keep the product page and sign-in public; send visitors without a
 *    session cookie from the workspace to that language's sign-in page.
 *    This is only a fast first pass; the API checks every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const segment = pathname.split("/")[1];

  if (!isLocale(segment)) {
    const locale = preferredLocale(request);
    const target = new URL(`/${locale}${pathname === "/" ? "" : pathname}${search}`, request.url);
    return NextResponse.redirect(target);
  }

  const page = withoutLocale(pathname);
  if (
    page === "/" ||
    page === "/login" ||
    !isWorkspacePath(page) ||
    request.cookies.has(SESSION_COOKIE)
  ) {
    return NextResponse.next();
  }

  const login = new URL(`/${segment}/login`, request.url);
  if (page !== "/") login.searchParams.set("next", page + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    // Everything except the API rewrite, Next internals and static files.
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.[a-z0-9]+$).*)",
  ],
};
