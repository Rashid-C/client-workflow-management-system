import { Controller, Get, Param, ParseIntPipe, Post, Query, Version } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import { NotificationQueryDto } from './dto.js';
import { NotificationsService } from './notifications.service.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Version('1')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationQueryDto) {
    return this.notifications.list(user.employeeId, query.cursor, query.limit);
  }

  @Version('1')
  @Get('unread-count')
  async unreadCount(@CurrentUser() user: AuthUser) {
    return { count: await this.notifications.unreadCount(user.employeeId) };
  }

  @Version('1')
  @Post('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead(user.employeeId);
  }

  @Version('1')
  @Post(':id/read')
  markRead(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notifications.markRead(user.employeeId, id);
  }
}
