import {
  Body,
  Controller,
  Delete,
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
import { FollowUpDto, LeadQueryDto, SaveLeadDto, UpdateLeadDto } from './dto.js';
import { LeadsService } from './leads.service.js';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Version('1')
  @RequirePermission('leads.view')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: LeadQueryDto) {
    return this.leads.list(user, query);
  }

  /** Pipeline counts. Declared before :id. */
  @Version('1')
  @RequirePermission('leads.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.leads.summary(user);
  }

  /** Active staff who can own a lead. Declared before :id. */
  @Version('1')
  @RequirePermission('leads.view')
  @Get('owners')
  owners() {
    return this.leads.owners();
  }

  @Version('1')
  @RequirePermission('leads.view')
  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.leads.findOne(user, id);
  }

  @Version('1')
  @RequirePermission('leads.create')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() data: SaveLeadDto, @Audit() audit: AuditContext) {
    return this.leads.create(user, data, audit);
  }

  @Version('1')
  @RequirePermission('leads.edit')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateLeadDto,
    @Audit() audit: AuditContext,
  ) {
    return this.leads.update(user, id, data, audit);
  }

  @Version('1')
  @RequirePermission('leads.edit')
  @Post(':id/follow-ups')
  addFollowUp(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: FollowUpDto,
    @Audit() audit: AuditContext,
  ) {
    return this.leads.addFollowUp(user, id, data, audit);
  }

  /** Also needs clients.create, checked by the service. */
  @Version('1')
  @RequirePermission('leads.edit')
  @Post(':id/convert')
  @HttpCode(200)
  convert(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Audit() audit: AuditContext) {
    return this.leads.convert(user, id, audit);
  }

  @Version('1')
  @RequirePermission('leads.delete')
  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Audit() audit: AuditContext) {
    return this.leads.remove(user, id, audit);
  }
}
