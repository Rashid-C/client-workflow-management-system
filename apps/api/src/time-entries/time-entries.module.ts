import { Module } from '@nestjs/common';
import { TimeEntriesController } from './time-entries.controller.js';
import { TimeEntriesService } from './time-entries.service.js';

@Module({
  controllers: [TimeEntriesController],
  providers: [TimeEntriesService],
})
export class TimeEntriesModule {}
