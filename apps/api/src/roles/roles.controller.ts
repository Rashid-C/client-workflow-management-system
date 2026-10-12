import { Controller, Get, Version } from '@nestjs/common';
import { RolesService } from './roles.service.js';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Version('1')
  @Get()
  findAll() {
    return this.rolesService.findAll();
  }
}
