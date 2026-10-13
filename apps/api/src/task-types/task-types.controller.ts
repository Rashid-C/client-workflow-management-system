import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Version,
} from '@nestjs/common';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { RequirePermission } from '../auth/decorators.js';
import {
  CreateTaskTypeDto,
  ListTaskTypesQuery,
  UpdateTaskTypeDto,
} from './dto.js';
import { TaskTypesService } from './task-types.service.js';

// Permission keys keep their original "workflows" names; the product calls
// these task types.
@Controller('task-types')
export class TaskTypesController {
  constructor(private readonly taskTypesService: TaskTypesService) {}

  @Version('1')
  @RequirePermission('workflows.view')
  @Get()
  findAll(@Query() query: ListTaskTypesQuery) {
    return this.taskTypesService.findAll(query.includeInactive);
  }

  @Version('1')
  @RequirePermission('workflows.view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.taskTypesService.findOne(id);
  }

  @Version('1')
  @RequirePermission('workflows.manage')
  @Post()
  create(@Body() data: CreateTaskTypeDto, @Audit() audit: AuditContext) {
    return this.taskTypesService.create(data, audit);
  }

  @Version('1')
  @RequirePermission('workflows.manage')
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTaskTypeDto,
    @Audit() audit: AuditContext,
  ) {
    return this.taskTypesService.update(id, data, audit);
  }

  /** Deletes an unused type; deactivates one that tasks were made from. */
  @Version('1')
  @RequirePermission('workflows.manage')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @Audit() audit: AuditContext) {
    return this.taskTypesService.remove(id, audit);
  }
}
