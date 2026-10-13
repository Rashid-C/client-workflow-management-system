import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthUser } from '../auth/session.js';
import type { AuditContext } from './audit.service.js';

export function auditContextFrom(request: Request & { user?: AuthUser }): AuditContext {
  return {
    actor: request.user
      ? { employeeId: request.user.employeeId, name: request.user.name }
      : null,
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}

/** The signed-in actor plus IP and browser, for writing audit entries. */
export const Audit = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuditContext =>
    auditContextFrom(context.switchToHttp().getRequest()),
);
