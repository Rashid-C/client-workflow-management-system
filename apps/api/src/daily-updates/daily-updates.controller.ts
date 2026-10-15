import { Body, Controller, Get, Put, Query, Version } from '@nestjs/common';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { CurrentUser, RequirePermission } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import { DailyUpdatesService } from './daily-updates.service.js';
import { DailyUpdateQueryDto, MissingQueryDto, SaveDailyUpdateDto } from './dto.js';

@Controller('daily-updates')
export class DailyUpdatesController {
  constructor(private readonly updates: DailyUpdatesService) {}

  @Version('1')
  @RequirePermission('daily_updates.view')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: DailyUpdateQueryDto) {
    return this.updates.list(user, query);
  }

  /** The viewer's own update and logged work for today. */
  @Version('1')
  @RequirePermission('daily_updates.create')
  @Get('today')
  today(@CurrentUser() user: AuthUser) {
    return this.updates.today(user);
  }

  @Version('1')
  @RequirePermission('daily_updates.create')
  @Put('today')
  saveToday(@CurrentUser() user: AuthUser, @Body() data: SaveDailyUpdateDto, @Audit() audit: AuditContext) {
    return this.updates.saveToday(user, data, audit);
  }

  @Version('1')
  @RequirePermission('daily_updates.view')
  @Get('missing')
  missing(@CurrentUser() user: AuthUser, @Query() query: MissingQueryDto) {
    return this.updates.missing(user, query.day);
  }
}
