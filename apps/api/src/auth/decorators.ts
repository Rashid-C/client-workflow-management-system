import {
  createParamDecorator,
  SetMetadata,
  type ExecutionContext,
} from '@nestjs/common';
import type { PermissionKey } from '../roles/permissions.js';
import type { AuthUser } from './session.js';

export const IS_PUBLIC = 'auth:isPublic';
export const REQUIRED_PERMISSION = 'auth:requiredPermission';
export const ALLOW_PENDING_PASSWORD = 'auth:allowPendingPassword';

/** Opt a route out of authentication. Everything else requires a session. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Require a permission, at either scope; services narrow "own" further. */
export const RequirePermission = (permission: PermissionKey) =>
  SetMetadata(REQUIRED_PERMISSION, permission);

/**
 * Let a signed-in user who still has a temporary password reach this route.
 * Every other route answers 403 until the password is changed.
 */
export const AllowPendingPassword = () =>
  SetMetadata(ALLOW_PENDING_PASSWORD, true);

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<{ user: AuthUser }>().user,
);
