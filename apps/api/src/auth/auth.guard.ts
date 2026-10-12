import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  type CanActivate,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { PermissionKey } from '../roles/permissions.js';
import { AuthService } from './auth.service.js';
import {
  ALLOW_PENDING_PASSWORD,
  IS_PUBLIC,
  REQUIRED_PERMISSION,
} from './decorators.js';
import { readCookie, SESSION_COOKIE, type AuthUser } from './session.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function allowedOrigins(): Set<string> {
  return new Set(
    (process.env['WEB_ORIGINS'] ?? 'http://localhost:3000')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

/**
 * Applied to every route. Order: CSRF origin check, session, pending
 * password change, then the route's permission.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly origins = allowedOrigins();

  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const flag = <T>(key: string) =>
      this.reflector.getAllAndOverride<T | undefined>(key, [
        context.getHandler(),
        context.getClass(),
      ]);

    // Browsers always send Origin on cross-site writes, so a write from a
    // foreign page is refused even though the cookie would ride along.
    // Requests without Origin (curl, a future mobile app) are not browsers.
    const origin = request.headers.origin;
    if (
      !SAFE_METHODS.has(request.method) &&
      origin !== undefined &&
      !this.origins.has(origin)
    ) {
      throw new ForbiddenException('Request origin is not allowed');
    }

    if (flag<boolean>(IS_PUBLIC)) return true;

    const token = readCookie(request.headers.cookie, SESSION_COOKIE);
    const user = token ? await this.authService.authenticate(token) : null;
    if (!user) throw new UnauthorizedException('Sign in to continue');
    request.user = user;

    if (user.mustChangePassword && !flag<boolean>(ALLOW_PENDING_PASSWORD)) {
      throw new ForbiddenException('Change your temporary password first');
    }

    const permission = flag<PermissionKey>(REQUIRED_PERMISSION);
    if (permission && !user.permissions[permission]) {
      throw new ForbiddenException('You do not have permission to do this');
    }

    return true;
  }
}
