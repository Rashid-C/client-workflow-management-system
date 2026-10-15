
import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuditModule } from './audit/audit.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { DailyUpdatesModule } from './daily-updates/daily-updates.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { DatabaseModule } from './database/database.module.js';
import { EmployeesModule } from './employees/employees.module.js';
import { LeadsModule } from './leads/leads.module.js';
import { RolesModule } from './roles/roles.module.js';
import { TaskTypesModule } from './task-types/task-types.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { TimeEntriesModule } from './time-entries/time-entries.module.js';

@Module({
  imports: [
    DatabaseModule,
    AuditModule,
    AuthModule,
    ClientsModule,
    DocumentsModule,
    EmployeesModule,
    LeadsModule,
    RolesModule,
    TaskTypesModule,
    TasksModule,
    TimeEntriesModule,
    DailyUpdatesModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
