
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ClientsModule } from './clients/clients.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { RolesModule } from './roles/roles.module.js';

@Module({
  imports: [DatabaseModule, ClientsModule, EmployeesModule, RolesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
