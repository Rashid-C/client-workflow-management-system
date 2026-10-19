import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from './notifications.service.js';

@Injectable()
export class NotificationsJob {
  private readonly logger = new Logger(NotificationsJob.name);
  private running = false;
  constructor(private readonly notifications: NotificationsService) {}

  @Cron('* * * * *', { timeZone: 'Asia/Dubai' })
  async run() {
    if (this.running) return;
    this.running = true;
    try {
      await this.notifications.runScheduledWork();
    } catch {
      this.logger.warn('Notification scheduling failed; it will retry on the next minute.');
    } finally {
      this.running = false;
    }
  }
}
