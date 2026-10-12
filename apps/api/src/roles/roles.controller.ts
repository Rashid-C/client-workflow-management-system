import { Controller, Get, Version } from '@nestjs/common';
import { RequirePermission } from '../auth/decorators.js';
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
}
