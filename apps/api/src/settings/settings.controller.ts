import { Body, Controller, Get, Patch, Version } from '@nestjs/common';
import { Audit } from '../audit/audit-context.decorator.js';
import type { AuditContext } from '../audit/audit.service.js';
import { RequirePermission } from '../auth/decorators.js';
import { UpdateSettingsDto } from './dto.js';
import { SettingsService } from './settings.service.js';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  /** Readable by everyone signed in: forms use the defaults. */
  @Version('1')
  @Get()
  get() {
    return this.settings.get();
  }

  @Version('1')
  @RequirePermission('settings.manage')
  @Patch()
  update(@Body() data: UpdateSettingsDto, @Audit() audit: AuditContext) {
    return this.settings.update(data, audit);
  }
}
