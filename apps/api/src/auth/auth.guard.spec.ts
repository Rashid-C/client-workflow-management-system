import {
  ForbiddenException,
  UnauthorizedException,
  type ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import type { AuthService } from './auth.service.js';
import {
  ALLOW_PENDING_PASSWORD,
  IS_PUBLIC,
  REQUIRED_PERMISSION,
} from './decorators.js';
import type { AuthUser } from './session.js';

const staff: AuthUser = {
  sessionId: 7,
  employeeId: 3,
  employeeCode: 'EMP-003',
  name: 'Sam Senior',
  email: 'sam@firm.ae',
  isSuperAdmin: false,
  mustChangePassword: false,
  preferredLanguage: 'en',
  emailNotificationsEnabled: true,
  permissions: { 'tasks.view': 'own' },
};

describe('AuthGuard', () => {
  let metadata: Record<string, unknown>;
  let authenticate: ReturnType<typeof vi.fn>;
  let guard: AuthGuard;

  const reflector = {
    getAllAndOverride: (key: string) => metadata[key],
  } as unknown as Reflector;

  function contextFor(request: Record<string, unknown>) {
    const req = { method: 'GET', headers: {}, ...request };
    return {
      req,
      context: {
        switchToHttp: () => ({ getRequest: () => req }),
        getHandler: () => undefined,
        getClass: () => undefined,
      } as unknown as ExecutionContext,
    };
  }

  beforeEach(() => {
    metadata = {};
    authenticate = vi.fn().mockResolvedValue(staff);
    guard = new AuthGuard(reflector, { authenticate } as unknown as AuthService);
  });

  it('lets public routes through without a session', async () => {
    metadata[IS_PUBLIC] = true;
    const { context } = contextFor({});

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('answers 401 without a session cookie', async () => {
    const { context } = contextFor({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('answers 401 when the session is unknown or expired', async () => {
    authenticate.mockResolvedValue(null);
    const { context } = contextFor({ headers: { cookie: 'tw_session=stale' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authenticate).toHaveBeenCalledWith('stale');
  });

  it('attaches the user and allows a held permission', async () => {
    metadata[REQUIRED_PERMISSION] = 'tasks.view';
    const { context, req } = contextFor({
      headers: { cookie: 'theme=dark; tw_session=abc' },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect((req as { user?: AuthUser }).user).toBe(staff);
  });

  it('answers 403 for a missing permission', async () => {
    metadata[REQUIRED_PERMISSION] = 'employees.create';
    const { context } = contextFor({ headers: { cookie: 'tw_session=abc' } });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('blocks everything but allowed routes until a temporary password is changed', async () => {
    authenticate.mockResolvedValue({ ...staff, mustChangePassword: true });
    const blocked = contextFor({ headers: { cookie: 'tw_session=abc' } });
    await expect(guard.canActivate(blocked.context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );

    metadata[ALLOW_PENDING_PASSWORD] = true;
    const allowed = contextFor({ headers: { cookie: 'tw_session=abc' } });
    await expect(guard.canActivate(allowed.context)).resolves.toBe(true);
  });

  it('refuses writes from a foreign origin, even on public routes', async () => {
    metadata[IS_PUBLIC] = true;
    const { context } = contextFor({
      method: 'POST',
      headers: { origin: 'https://evil.example' },
    });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('accepts writes from the web origin and from non-browser clients', async () => {
    metadata[IS_PUBLIC] = true;
    const fromWeb = contextFor({
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
    });
    const noOrigin = contextFor({ method: 'POST' });

    await expect(guard.canActivate(fromWeb.context)).resolves.toBe(true);
    await expect(guard.canActivate(noOrigin.context)).resolves.toBe(true);
  });
});
