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
import { DocumentsService } from './documents.service.js';
import { DocumentQueryDto, SaveDocumentDto, UpdateDocumentDto } from './dto.js';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Version('1')
  @RequirePermission('documents.view')
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: DocumentQueryDto) {
    return this.documents.list(user, query);
  }

  /** Counts per expiry state. Declared before any :id route. */
  @Version('1')
  @RequirePermission('documents.view')
  @Get('summary')
  summary(@CurrentUser() user: AuthUser) {
    return this.documents.summary(user);
  }

  @Version('1')
  @RequirePermission('documents.create')
  @Post()
  create(@CurrentUser() user: AuthUser, @Body() data: SaveDocumentDto, @Audit() audit: AuditContext) {
    return this.documents.create(user, data, audit);
  }

  @Version('1')
  @RequirePermission('documents.edit')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDocumentDto,
    @Audit() audit: AuditContext,
  ) {
    return this.documents.update(user, id, data, audit);
  }

  @Version('1')
  @RequirePermission('documents.delete')
  @Delete(':id')
  @HttpCode(204)
  remove(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Audit() audit: AuditContext) {
    return this.documents.remove(user, id, audit);
  }
}
