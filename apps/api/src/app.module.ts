
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClientsModule } from './clients/clients.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EmployeesModule } from './employees/employees.module.js';

@Module({
  imports: [DatabaseModule, ClientsModule, EmployeesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
