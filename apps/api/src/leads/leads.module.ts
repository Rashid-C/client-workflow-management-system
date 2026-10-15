import { Module } from '@nestjs/common';
import { ClientsModule } from '../clients/clients.module.js';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';

@Module({
  imports: [ClientsModule],
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
