import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Version,
} from '@nestjs/common';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { CurrentUser, RequirePermission } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import { ClientsService } from './clients.service.js';
import { ArchiveClientDto, CreateClientDto, UpdateClientDto } from './dto/create-client.dto.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Version('1')
  @RequirePermission('clients.view')
  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.clientsService.findAll(user);
  }

  /** Active staff who can be a client's account manager. Declared before :id. */
  @Version('1')
  @RequirePermission('clients.view')
  @Get('account-managers')
  accountManagers() {
    return this.clientsService.accountManagers();
  }

  @Version('1')
  @RequirePermission('clients.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.clientsService.findOne(user, id);
  }

  @Version('1')
  @RequirePermission('clients.create')
  @Post()
  create(@Body() data: CreateClientDto, @Audit() audit: AuditContext) {
    return this.clientsService.create(data, audit);
  }

  @Version('1')
  @RequirePermission('clients.edit')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateClientDto,
    @Audit() audit: AuditContext,
  ) {
    return this.clientsService.update(user, id, data, audit);
  }

  // clients.delete covers archiving: clients are never deleted, so their
  // tasks, time and history stay intact.
  @Version('1')
  @RequirePermission('clients.delete')
  @Post(':id/archive')
  @HttpCode(200)
  archive(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ArchiveClientDto,
    @Audit() audit: AuditContext,
  ) {
    return this.clientsService.setArchived(user, id, true, data.reason ?? null, audit);
  }

  @Version('1')
  @RequirePermission('clients.delete')
  @Post(':id/restore')
  @HttpCode(200)
  restore(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: ArchiveClientDto,
    @Audit() audit: AuditContext,
  ) {
    return this.clientsService.setArchived(user, id, false, data.reason ?? null, audit);
  }
}
