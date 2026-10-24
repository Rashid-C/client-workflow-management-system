import { Controller, Get, Param, Query, Res, StreamableFile, Version } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, RequirePermission } from '../auth/decorators.js';
import type { AuthUser } from '../auth/session.js';
import { ReportQueryDto } from './dto.js';
import { ReportsService } from './reports.service.js';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  // Declared before ':name' so "filters" is not read as a report name.
  @Version('1')
  @RequirePermission('reports.view')
  @Get('filters')
  filters(@CurrentUser() user: AuthUser) {
    return this.reports.filters(user);
  }

  @Version('1')
  @RequirePermission('reports.export')
  @Get(':name.xlsx')
  async export(
    @CurrentUser() user: AuthUser,
    @Param('name') name: string,
    @Query() query: ReportQueryDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const workbook = await this.reports.exportXlsx(name, user, query, query.lang ?? 'en');
    const filename = `tickwise-${name}.xlsx`;
    response.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return new StreamableFile(workbook);
  }

  @Version('1')
  @RequirePermission('reports.view')
  @Get(':name')
  get(
    @CurrentUser() user: AuthUser,
    @Param('name') name: string,
    @Query() query: ReportQueryDto,
  ) {
    return this.reports.getReport(name, user, query);
  }
}
