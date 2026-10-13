import { Controller, Get, Query, Version } from '@nestjs/common';
import { CurrentUser, RequirePermission } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import { AuditService } from './audit.service.js';
import { ListAuditLogsQuery } from './dto.js';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Version('1')
  @RequirePermission('history.view')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListAuditLogsQuery) {
    return this.auditService.list(user, query);
  }
}
