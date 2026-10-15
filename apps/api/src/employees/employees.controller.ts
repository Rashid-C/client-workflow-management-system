import {
  Body,
  Controller,
  Get,
  HttpCode,
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
  ResetPasswordDto,
  UpdateEmployeeDto,
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
  @RequirePermission('employees.view')
  @Get(':employeeCode')
  findOne(@CurrentUser() user: AuthUser, @Param('employeeCode') employeeCode: string) {
    return this.employeesService.findOne(user, employeeCode);
  }

  @Version('1')
  @RequirePermission('employees.create')
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() data: CreateEmployeeDto,
    @Audit() audit: AuditContext,
  ) {
    return this.employeesService.create(user, data, audit);
  }

  @Version('1')
  @RequirePermission('employees.edit')
  @Patch(':employeeCode')
  update(
    @CurrentUser() user: AuthUser,
    @Param('employeeCode') employeeCode: string,
    @Body() data: UpdateEmployeeDto,
    @Audit() audit: AuditContext,
  ) {
    return this.employeesService.update(user, employeeCode, data, audit);
  }

  @Version('1')
  @RequirePermission('employees.deactivate')
  @Patch(':employeeCode/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('employeeCode') employeeCode: string,
    @Body() data: UpdateEmployeeStatusDto,
    @Audit() audit: AuditContext,
  ) {
    return this.employeesService.updateStatus(user, employeeCode, data.status, audit);
  }

  @Version('1')
  @RequirePermission('employees.edit')
  @Post(':employeeCode/reset-password')
  @HttpCode(200)
  resetPassword(
    @CurrentUser() user: AuthUser,
    @Param('employeeCode') employeeCode: string,
    @Body() data: ResetPasswordDto,
    @Audit() audit: AuditContext,
  ) {
    return this.employeesService.resetPassword(user, employeeCode, data.temporaryPassword, audit);
  }
}
