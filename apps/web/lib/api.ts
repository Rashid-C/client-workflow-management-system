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
  permissions: Record<string, PermissionScope | undefined>;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// Nest's ValidationPipe returns `message` as a list of field errors.
async function readApiError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  const message = body?.message;
  if (Array.isArray(message)) return message.join(" ");
  return typeof message === "string" ? message : fallback;
}

function redirectTo(path: string) {
  const here = window.location.pathname + window.location.search;
  if (window.location.pathname !== path) {
    // Full reload on purpose: drop every piece of state from the old session.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`${path}?next=${encodeURIComponent(here)}`);
  }
}

/**
 * fetch for the Tickwise API. Throws ApiError with the server's message on
 * failure. A lost session sends the browser to /login; a pending temporary
 * password sends it to /change-password.
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "same-origin",
    cache: "no-store",
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (response.status === 401 && !path.startsWith("/auth/login")) {
    redirectTo("/login");
  }

  if (!response.ok) {
    const message = await readApiError(
      response,
      `Request failed (${response.status}).`,
    );
    if (response.status === 403 && message.includes("temporary password")) {
      redirectTo("/change-password");
    }
    throw new ApiError(message, response.status);
  }

  return response.status === 204
    ? (undefined as T)
    : ((await response.json()) as T);
}

/** Only same-site paths, so ?next= cannot bounce users to another site. */
export function safeNextPath(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
