import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Version,
} from '@nestjs/common';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { CurrentUser, RequirePermission } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import { EmployeesService } from './employees.service.js';
import {
  CreateEmployeeDto,
  UpdateEmployeeStatusDto,
} from './dto/create-employee.dto.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Version('1')
  @RequirePermission('employees.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.employeesService.findAll(user);
  }

  @Version('1')
  @RequirePermission('employees.create')
  @Post()
  create(@Body() data: CreateEmployeeDto, @Audit() audit: AuditContext) {
    return this.employeesService.create(data, audit);
  }

  @Version('1')
  @RequirePermission('employees.deactivate')
  @Patch(':employeeCode/status')
  updateStatus(
    @Param('employeeCode') employeeCode: string,
    @Body() data: UpdateEmployeeStatusDto,
    @Audit() audit: AuditContext,
  ) {
    return this.employeesService.updateStatus(employeeCode, data.status, audit);
  }
}
