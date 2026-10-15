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
  Version,
} from '@nestjs/common';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { RequirePermission } from '../auth/decorators.js';
import { SaveRoleDto, UpdateRoleDto } from './dto.js';
import { RolesService } from './roles.service.js';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Version('1')
  @RequirePermission('roles.view')
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }

  /** Every permission a role can hold. Declared before :id. */
  @Version('1')
  @RequirePermission('roles.view')
  @Get('permissions')
  catalogue() {
    return this.rolesService.catalogue();
  }

  @Version('1')
  @RequirePermission('roles.manage')
  @Post()
  create(@Body() data: SaveRoleDto, @Audit() audit: AuditContext) {
    return this.rolesService.create(data, audit);
  }

  @Version('1')
  @RequirePermission('roles.manage')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateRoleDto,
    @Audit() audit: AuditContext,
  ) {
    return this.rolesService.update(id, data, audit);
  }

  @Version('1')
  @RequirePermission('roles.manage')
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @Audit() audit: AuditContext) {
    return this.rolesService.remove(id, audit);
  }
}
