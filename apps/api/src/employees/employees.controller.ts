import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Version,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { EmployeesService } from './employees.service.js';
import { CreateEmployeeDto } from './dto/create-employee.dto.js';

class UpdateEmployeeStatusDto {
  @IsIn(['Active', 'Inactive'])
  status!: 'Active' | 'Inactive';
}

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
