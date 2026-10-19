import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsJob } from './notifications.job.js';
import { SmtpMailer } from './mailer.js';
import { NotificationsService } from './notifications.service.js';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsJob,
    SmtpMailer,
    { provide: 'MAILER', useExisting: SmtpMailer },
  ],
})
export class NotificationsModule {}
