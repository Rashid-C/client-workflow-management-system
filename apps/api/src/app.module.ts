
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClientsModule } from './clients/clients.module.js';

@Module({
  controllers: [AppController],
  providers: [AppService],
  imports: [ClientsModule],
})
export class AppModule {}
