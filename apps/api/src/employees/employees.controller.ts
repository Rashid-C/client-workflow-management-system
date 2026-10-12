import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Version,
} from '@nestjs/common';
import { EmployeesService } from './employees.service.js';
import {
  CreateEmployeeDto,
  UpdateEmployeeStatusDto,
} from './dto/create-employee.dto.js';

@Controller('employees')
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Version('1')
  @Get()
  findAll() {
    return this.employeesService.findAll();
  }

  @Version('1')
  @Post()
  create(@Body() data: CreateEmployeeDto) {
    return this.employeesService.create(data);
  }

  @Version('1')
  @Patch(':employeeCode/status')
  updateStatus(
    @Param('employeeCode') employeeCode: string,
    @Body() data: UpdateEmployeeStatusDto,
  ) {
    return this.employeesService.updateStatus(employeeCode, data.status);
  }
}
