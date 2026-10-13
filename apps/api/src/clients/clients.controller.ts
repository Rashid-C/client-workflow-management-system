import {
  Body,
  Controller,
  Get,
  Post,
  Version,
} from '@nestjs/common';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { RequirePermission } from '../auth/decorators.js';
import { ClientsService } from './clients.service.js';
import { CreateClientDto } from './dto/create-client.dto.js';

@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Version('1')
  @RequirePermission('clients.view')
  @Get()
  findAll() {
    return this.clientsService.findAll();
  }

  @Version('1')
  @RequirePermission('clients.create')
  @Post()
  create(@Body() data: CreateClientDto, @Audit() audit: AuditContext) {
    return this.clientsService.create(data, audit);
  }
}
