import { createHash, randomBytes } from 'node:crypto';
import type { PermissionKey, PermissionScope } from '../roles/permissions.js';

export const SESSION_COOKIE = 'tw_session';

// One working day, ended early by two idle hours (agreed 2026-10-12).
export const SESSION_ABSOLUTE_MS = 12 * 60 * 60 * 1000;
export const SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
// Touch lastSeenAt at most once a minute, not on every request.
export const SESSION_TOUCH_MS = 60 * 1000;

export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_MS = 15 * 60 * 1000;

/** 256 random bits for the cookie; only its hash goes to the database. */
export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** The signed-in employee, attached to the request by AuthGuard. */
export interface AuthUser {
  sessionId: number;
  employeeId: number;
  employeeCode: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
  preferredLanguage: 'en' | 'ar';
  permissions: Partial<Record<PermissionKey, PermissionScope>>;
}

export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === name) {
      try {
        return decodeURIComponent(part.slice(separator + 1).trim());
      } catch {
        return undefined; // malformed cookie: treat as signed out
      }
    }
  }
  return undefined;
}
