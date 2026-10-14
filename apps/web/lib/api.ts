import { currentLocale, withLocale, withoutLocale } from "@/lib/i18n/config";

// Same-origin path; next.config.ts rewrites /api to the NestJS API.
export const API_BASE = "/api/v1";

export type PermissionScope = "own" | "all";

export type CurrentUser = {
  employeeId: number;
  employeeCode: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  preferredLanguage: "en" | "ar";
  permissions: Record<string, PermissionScope | undefined>;
};

export type ErrorParams = Record<string, string | number>;

/**
 * A failed API call. `code` names the problem (see apps/api/src/common/
 * errors.ts) so the screen can say it in the reader's language; `message` is
 * the server's English sentence. Status 0 with code "network" means the API
 * could not be reached at all.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly params?: ErrorParams,
  ) {
    super(message);
  }
}

async function readApiError(response: Response): Promise<ApiError> {
  const body = await response.json().catch(() => null);
  const raw = body?.message;
  // Errors without a code may still carry Nest's list of field messages.
  const message = Array.isArray(raw)
    ? raw.join(" ")
    : typeof raw === "string"
      ? raw
      : `Request failed (${response.status}).`;
  const code = typeof body?.code === "string" ? body.code : undefined;
  const params =
    body?.params && typeof body.params === "object" ? (body.params as ErrorParams) : undefined;
  return new ApiError(message, response.status, code, params);
}

/** `path` without a language, e.g. "/login"; the current language is kept. */
function redirectTo(path: string) {
  const page = withoutLocale(window.location.pathname);
  if (page !== path) {
    const here = page + window.location.search;
    // Full reload on purpose: drop every piece of state from the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${withLocale(currentLocale(), path)}?next=${encodeURIComponent(here)}`);
  }
}

/**
 * fetch for the Tickwise API. Throws ApiError on failure; show it with
 * useI18n().errorText. A lost session sends the browser to /login; a pending temporary
 * password sends it to /change-password.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      cache: "no-store",
      ...init,
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    // A cancelled request stays an AbortError; callers ignore those.
    if (error instanceof Error && error.name === "AbortError") throw error;
    throw new ApiError("Could not reach the server.", 0, "network");
  }

  if (response.status === 401 && !path.startsWith("/auth/login")) {
    redirectTo("/login");
  }

  if (!response.ok) {
    const error = await readApiError(response);
    if (error.code === "auth.password_change_required") {
      redirectTo("/change-password");
    }
    throw error;
  }

  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

/** Only same-site paths, so ?next= cannot bounce users to another site. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/overview";
}
