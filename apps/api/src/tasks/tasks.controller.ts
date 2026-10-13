import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Version,
} from '@nestjs/common';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { CurrentUser, RequirePermission } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import {
  BlockStageDto,
  CompleteStageDto,
  CreateTaskDto,
  ListTasksQuery,
  ReassignStageDto,
  ReopenStageDto,
  UpdateTaskDto,
} from './dto.js';
import { TaskStagesService } from './task-stages.service.js';
import { TasksService } from './tasks.service.js';

@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasks: TasksService,
    private readonly stages: TaskStagesService,
  ) {}

  @Version('1')
  @RequirePermission('tasks.view')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListTasksQuery) {
    return this.tasks.list(user, query);
  }

  /** People a stage can be assigned or handed over to. */
  @Version('1')
  @RequirePermission('tasks.assign')
  @Get('assignable-employees')
  assignable() {
    return this.tasks.assignableEmployees();
  }

  @Version('1')
  @RequirePermission('tasks.view')
  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.tasks.get(user, id);
  }

  @Version('1')
  @RequirePermission('tasks.create')
  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body() data: CreateTaskDto,
    @Audit() audit: AuditContext,
  ) {
    return this.tasks.create(user, data, audit);
  }

  @Version('1')
  @RequirePermission('tasks.edit')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTaskDto,
    @Audit() audit: AuditContext,
  ) {
    return this.tasks.update(user, id, data, audit);
  }

  @Version('1')
  @RequirePermission('tasks.delete')
  @Post(':id/archive')
  @HttpCode(200)
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Audit() audit: AuditContext,
  ) {
    return this.tasks.setArchived(user, id, true, audit);
  }

  @Version('1')
  @RequirePermission('tasks.delete')
  @Post(':id/restore')
  @HttpCode(200)
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Audit() audit: AuditContext,
  ) {
    return this.tasks.setArchived(user, id, false, audit);
  }

  @Version('1')
  @RequirePermission('tasks.complete')
  @Post(':id/stages/:position/start')
  @HttpCode(200)
  start(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('position', ParseIntPipe) position: number,
    @Audit() audit: AuditContext,
  ) {
    return this.stages.start(user, id, position, audit);
  }

  @Version('1')
  @RequirePermission('tasks.complete')
  @Post(':id/stages/:position/complete')
  @HttpCode(200)
  complete(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('position', ParseIntPipe) position: number,
    @Body() data: CompleteStageDto,
    @Audit() audit: AuditContext,
  ) {
    return this.stages.complete(user, id, position, data, audit);
  }

  @Version('1')
  @RequirePermission('tasks.complete')
  @Post(':id/stages/:position/block')
  @HttpCode(200)
  block(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('position', ParseIntPipe) position: number,
    @Body() data: BlockStageDto,
    @Audit() audit: AuditContext,
  ) {
    return this.stages.block(user, id, position, data, audit);
  }

  @Version('1')
  @RequirePermission('tasks.complete')
  @Post(':id/stages/:position/resume')
  @HttpCode(200)
  resume(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('position', ParseIntPipe) position: number,
    @Audit() audit: AuditContext,
  ) {
    return this.stages.resume(user, id, position, audit);
  }

  @Version('1')
  @RequirePermission('tasks.assign')
  @Post(':id/stages/:position/reassign')
  @HttpCode(200)
  reassign(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('position', ParseIntPipe) position: number,
    @Body() data: ReassignStageDto,
    @Audit() audit: AuditContext,
  ) {
    return this.stages.reassign(user, id, position, data, audit);
  }

  @Version('1')
  @RequirePermission('tasks.reopen')
  @Post(':id/stages/:position/reopen')
  @HttpCode(200)
  reopen(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Param('position', ParseIntPipe) position: number,
    @Body() data: ReopenStageDto,
    @Audit() audit: AuditContext,
  ) {
    return this.stages.reopen(user, id, position, data, audit);
  }
}
