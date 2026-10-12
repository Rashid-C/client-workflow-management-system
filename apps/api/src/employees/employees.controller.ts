import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Version,
} from '@nestjs/common';
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
  create(@Body() data: CreateEmployeeDto) {
    return this.employeesService.create(data);
  }

  @Version('1')
  @RequirePermission('employees.deactivate')
  @Patch(':employeeCode/status')
  updateStatus(
    @Param('employeeCode') employeeCode: string,
    @Body() data: UpdateEmployeeStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.employeesService.updateStatus(employeeCode, data.status, user);
  }
}
