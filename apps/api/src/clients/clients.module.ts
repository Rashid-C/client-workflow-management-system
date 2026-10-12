
import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';

@Module({
  controllers: [ClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
