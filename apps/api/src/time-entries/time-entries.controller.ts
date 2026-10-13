import { Controller, Get, Query, Version } from '@nestjs/common';
import { CurrentUser, RequirePermission } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import { ListTimeEntriesQuery } from './dto.js';
import { TimeEntriesService } from './time-entries.service.js';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntries: TimeEntriesService) {}

  @Version('1')
  @RequirePermission('time_logs.view')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListTimeEntriesQuery) {
    return this.timeEntries.list(user, query);
  }
}
