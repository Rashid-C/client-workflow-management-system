import { Controller, Get, Version } from '@nestjs/common';
import { CurrentUser, RequirePermission } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import { DashboardService } from './dashboard.service.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Version('1')
  @RequirePermission('dashboard.view')
  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.dashboard.get(user);
  }
}
