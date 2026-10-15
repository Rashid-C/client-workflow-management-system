import { Module } from '@nestjs/common';
import { DailyUpdatesController } from './daily-updates.controller.js';
import { DailyUpdatesService } from './daily-updates.service.js';

@Module({
  controllers: [DailyUpdatesController],
  providers: [DailyUpdatesService],
})
export class DailyUpdatesModule {}
