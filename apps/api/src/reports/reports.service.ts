import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import ExcelJS from 'exceljs';
import type { Pool } from 'pg';
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { AuthUser } from '../auth/session.js';
import type { ReportQueryDto } from './dto.js';

export const REPORT_NAMES = ['time-by-employee', 'time-by-client', 'task-status', 'expiring-documents', 'leads-pipeline'] as const;
export type ReportName = (typeof REPORT_NAMES)[number];
export type ReportLanguage = 'en' | 'ar';
type ScopePermission = 'reports.view' | 'reports.export';
type Row = Record<string, string | number | null | Date | undefined>;

type DateRange = { from: string; to: string; today: string };

export function officeDateRange(now = new Date()): DateRange {
  const today = officeDay(now);
  const [year, month] = today.split('-');
  return { from: `${year}-${month}-01`, to: today, today };
}

function officeDay(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Dubai', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values['year']}-${values['month']}-${values['day']}`;
}

function addDays(day: string, count: number) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}

function validDay(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function dateRange(query: ReportQueryDto): DateRange {
  const defaults = officeDateRange();
  const from = query.from ?? defaults.from;
  const to = query.to ?? defaults.to;
  if (!validDay(from) || !validDay(to) || from > to) {
    throw new BadRequestException(problem('reports.invalid_range', 'Enter a valid date range'));
  }
  return { from, to, today: defaults.today };
}

function ownScope(viewer: AuthUser, permission: ScopePermission) {
  return viewer.permissions[permission] === 'own';
}

function timeFilters(viewer: AuthUser, query: ReportQueryDto, range: DateRange, permission: ScopePermission, clientAlias = 'c') {
  const values: unknown[] = [range.from, range.to];
  const where = ['te."workDate" >= $1::date', 'te."workDate" <= $2::date'];
  if (ownScope(viewer, permission)) {
    values.push(viewer.employeeId);
    where.push(`te."employeeId" = $${values.length}`);
  } else if (query.employeeId) {
    values.push(query.employeeId);
    where.push(`te."employeeId" = $${values.length}`);
  }
  if (query.clientId) {
    values.push(query.clientId);
    where.push(`${clientAlias}."id" = $${values.length}`);
  }
  if (query.taskTypeId) {
    values.push(query.taskTypeId);
    where.push(`tt."id" = $${values.length}`);
  }
  return { where: where.join(' AND '), values };
}

function taskScope(viewer: AuthUser, permission: ScopePermission, param: (value: unknown) => string) {
  if (!ownScope(viewer, permission)) return 'TRUE';
  const employee = param(viewer.employeeId);
  return `(t."createdById" = ${employee} OR EXISTS (
    SELECT 1 FROM "TaskStage" os WHERE os."taskId" = t."id" AND os."assigneeId" = ${employee}))`;
}

function clientScope(viewer: AuthUser, permission: ScopePermission, param: (value: unknown) => string) {
  if (!ownScope(viewer, permission)) return 'TRUE';
  const employee = param(viewer.employeeId);
  return `(c."accountManagerId" = ${employee} OR EXISTS (
    SELECT 1 FROM "Task" ct WHERE ct."clientId" = c."id"
      AND (ct."createdById" = ${employee} OR EXISTS (
        SELECT 1 FROM "TaskStage" cs WHERE cs."taskId" = ct."id" AND cs."assigneeId" = ${employee}))))`;
}

function leadScope(viewer: AuthUser, permission: ScopePermission, param: (value: unknown) => string) {
  if (!ownScope(viewer, permission)) return 'TRUE';
  const employee = param(viewer.employeeId);
  return `(l."ownerId" = ${employee} OR l."createdById" = ${employee})`;
}

@Injectable()
export class ReportsService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async getReport(name: string, viewer: AuthUser, query: ReportQueryDto, permission: ScopePermission = 'reports.view') {
    if (!REPORT_NAMES.includes(name as ReportName)) throw new NotFoundException();
    if (!viewer.permissions[permission]) throw new ForbiddenException(problem('auth.forbidden', 'You do not have permission to access reports'));
    const report = name as ReportName;
    const range = dateRange(query);
    switch (report) {
      case 'time-by-employee': return this.timeByEmployee(viewer, query, range, permission);
      case 'time-by-client': return this.timeByClient(viewer, query, range, permission);
      case 'task-status': return this.taskStatus(viewer, query, range, permission);
      case 'expiring-documents': return this.expiringDocuments(viewer, query, range, permission);
      case 'leads-pipeline': return this.leadsPipeline(viewer, query, range, permission);
    }
  }

  /**
   * Choices for the report filter dropdowns, within the viewer's report scope.
   * Own-scope viewers only ever see their own time, so they get no employee list.
   */
  async filters(viewer: AuthUser) {
    const values: unknown[] = [];
    const param = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const scope = clientScope(viewer, 'reports.view', param);
    const own = ownScope(viewer, 'reports.view');
    const [clients, employees, taskTypes] = await Promise.all([
      this.pool.query<{ id: number; name: string; clientCode: string }>(
        `SELECT c."id", c."name", c."clientCode" FROM "Client" c
         WHERE c."isActive" AND ${scope} ORDER BY c."name"`,
        values,
      ),
      own
        ? Promise.resolve({ rows: [] })
        : this.pool.query<{ id: number; name: string }>(
            `SELECT "id", "name" FROM "Employee" WHERE "status" = 'Active' ORDER BY "name"`,
          ),
      this.pool.query<{ id: number; name: string }>(
        `SELECT "id", "name" FROM "TaskType" WHERE "isActive" ORDER BY "name"`,
      ),
    ]);
    return { clients: clients.rows, employees: employees.rows, taskTypes: taskTypes.rows };
  }

  async exportXlsx(name: string, viewer: AuthUser, query: ReportQueryDto, language: ReportLanguage) {
    const data = await this.getReport(name, viewer, query, 'reports.export') as Record<string, unknown>;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Tickwise';
    workbook.created = new Date();
    const languageLabels = EXCEL_LABELS[language];
    const tables = this.tables(name as ReportName, data, languageLabels);
    for (const table of tables) {
      const sheet = workbook.addWorksheet(table.name.slice(0, 31), { views: [{ rightToLeft: language === 'ar' }] });
      sheet.columns = table.columns.map((column) => ({ key: column.key, width: column.width ?? 22 }));
      const header = sheet.addRow(table.columns.map((column) => column.label));
      header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      header.alignment = { vertical: 'middle' };
      for (const row of table.rows) {
        sheet.addRow(table.columns.map((column) => this.excelValue(column.key, row[column.key])));
      }
      sheet.views = [{ state: 'frozen', ySplit: 1, rightToLeft: language === 'ar' }];
      sheet.autoFilter = { from: 'A1', to: `${columnName(table.columns.length)}1` };
      table.columns.forEach((column, index) => {
        const excelColumn = sheet.getColumn(index + 1);
        if (column.key === 'hours') excelColumn.numFmt = '0.00';
        if (['workDate', 'dueDate', 'expiryDate'].includes(column.key)) excelColumn.numFmt = 'yyyy-mm-dd';
        if (column.key === 'value') excelColumn.numFmt = '#,##0.00';
      });
    }
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async timeByEmployee(viewer: AuthUser, query: ReportQueryDto, range: DateRange, permission: ScopePermission) {
    const filters = timeFilters(viewer, query, range, permission);
    const result = await this.pool.query<Row>(
      `SELECT e."id" AS "employeeId", e."name" AS "employee", c."id" AS "clientId", c."name" AS "client",
              sum(te."minutes")::int AS "minutes"
       FROM "TimeEntry" te JOIN "Employee" e ON e."id" = te."employeeId"
       JOIN "Task" t ON t."id" = te."taskId" JOIN "Client" c ON c."id" = t."clientId"
       JOIN "TaskType" tt ON tt."id" = t."taskTypeId"
       WHERE ${filters.where}
       GROUP BY e."id", e."name", c."id", c."name"
       ORDER BY lower(e."name"), lower(c."name")`, filters.values,
    );
    return { from: range.from, to: range.to, rows: result.rows, totalMinutes: result.rows.reduce((sum, row) => sum + Number(row['minutes']), 0) };
  }

  private async timeByClient(viewer: AuthUser, query: ReportQueryDto, range: DateRange, permission: ScopePermission) {
    const filters = timeFilters(viewer, query, range, permission);
    const result = await this.pool.query<Row>(
      `SELECT c."id" AS "clientId", c."name" AS "client", tt."id" AS "taskTypeId", tt."name" AS "taskType",
              sum(te."minutes")::int AS "minutes"
       FROM "TimeEntry" te JOIN "Task" t ON t."id" = te."taskId" JOIN "Client" c ON c."id" = t."clientId"
       JOIN "TaskType" tt ON tt."id" = t."taskTypeId"
       WHERE ${filters.where}
       GROUP BY c."id", c."name", tt."id", tt."name"
       ORDER BY lower(c."name"), lower(tt."name")`, filters.values,
    );
    return { from: range.from, to: range.to, rows: result.rows, totalMinutes: result.rows.reduce((sum, row) => sum + Number(row['minutes']), 0) };
  }

  private async taskStatus(viewer: AuthUser, query: ReportQueryDto, range: DateRange, permission: ScopePermission) {
    const values: unknown[] = [range.from, addDays(range.to, 1)];
    const param = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const where = [
      `t."createdAt" >= ($1::date::timestamp AT TIME ZONE 'Asia/Dubai')`,
      `t."createdAt" < ($2::date::timestamp AT TIME ZONE 'Asia/Dubai')`,
      't."archivedAt" IS NULL', taskScope(viewer, permission, param),
    ];
    if (query.clientId) where.push(`t."clientId" = ${param(query.clientId)}`);
    if (query.taskTypeId) where.push(`tt."id" = ${param(query.taskTypeId)}`);
    if (query.status) where.push(`t."status"::text = ${param(query.status)}`);
    const [counts, overdue] = await Promise.all([
      this.pool.query<Row>(
        `SELECT t."status", tt."id" AS "taskTypeId", tt."name" AS "taskType", count(*)::int AS "count"
         FROM "Task" t JOIN "TaskType" tt ON tt."id" = t."taskTypeId"
         WHERE ${where.join(' AND ')} GROUP BY t."status", tt."id", tt."name" ORDER BY tt."name", t."status"`, values,
      ),
      this.pool.query<Row>(
        `SELECT t."id", t."title", t."status", t."dueDate", c."id" AS "clientId", c."name" AS "client",
                tt."name" AS "taskType"
         FROM "Task" t JOIN "Client" c ON c."id" = t."clientId" JOIN "TaskType" tt ON tt."id" = t."taskTypeId"
         WHERE ${where.join(' AND ')} AND t."status" <> 'Completed' AND t."dueDate" < $${values.length + 1}::date
         ORDER BY t."dueDate", lower(c."name"), t."id"`, [...values, range.today],
      ),
    ]);
    return { from: range.from, to: range.to, byStatusAndType: counts.rows, overdue: overdue.rows };
  }

  private async expiringDocuments(viewer: AuthUser, query: ReportQueryDto, range: DateRange, permission: ScopePermission) {
    const days = query.days ?? 30;
    const from = query.from ?? range.today;
    const to = query.to ?? addDays(range.today, days);
    if (!validDay(from) || !validDay(to) || from > to) {
      throw new BadRequestException(problem('reports.invalid_range', 'Enter a valid expiry date range'));
    }
    const values: unknown[] = [from, to, range.today];
    const param = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const where = [
      'd."archivedAt" IS NULL', 'd."expiryDate" IS NOT NULL',
      'd."expiryDate" >= $1::date', 'd."expiryDate" <= $2::date',
      clientScope(viewer, permission, param),
    ];
    if (query.clientId) where.push(`c."id" = ${param(query.clientId)}`);
    const result = await this.pool.query<Row>(
      `SELECT c."id" AS "clientId", c."name" AS "client", d."type" AS "type", d."documentNumber" AS "number",
              d."expiryDate" AS "expiryDate", (d."expiryDate" - $3::date)::int AS "daysLeft"
       FROM "Document" d JOIN "Client" c ON c."id" = d."clientId"
       WHERE ${where.join(' AND ')} ORDER BY d."expiryDate", lower(c."name"), d."id"`, values,
    );
    return { from, to, days, rows: result.rows };
  }

  private async leadsPipeline(viewer: AuthUser, query: ReportQueryDto, range: DateRange, permission: ScopePermission) {
    const values: unknown[] = [range.from, addDays(range.to, 1)];
    const param = (value: unknown) => { values.push(value); return `$${values.length}`; };
    const scope = leadScope(viewer, permission, param);
    const pipelineWhere = [
      `l."createdAt" >= ($1::date::timestamp AT TIME ZONE 'Asia/Dubai')`,
      `l."createdAt" < ($2::date::timestamp AT TIME ZONE 'Asia/Dubai')`,
      'l."archivedAt" IS NULL', scope,
    ];
    if (query.status) pipelineWhere.push(`l."status"::text = ${param(query.status)}`);
    if (query.clientId) pipelineWhere.push(`l."clientId" = ${param(query.clientId)}`);
    const pipeline = await this.pool.query<Row>(
      `SELECT l."status", count(*)::int AS "count", coalesce(sum(l."estimatedValue"), 0)::int AS "value"
       FROM "Lead" l WHERE ${pipelineWhere.join(' AND ')} GROUP BY l."status" ORDER BY l."status"`, values,
    );

    const closedValues: unknown[] = [range.from, addDays(range.to, 1)];
    const closedParam = (value: unknown) => { closedValues.push(value); return `$${closedValues.length}`; };
    const closedScope = leadScope(viewer, permission, closedParam);
    const closedWhere = [
      `a."occurredAt" >= ($1::date::timestamp AT TIME ZONE 'Asia/Dubai')`,
      `a."occurredAt" < ($2::date::timestamp AT TIME ZONE 'Asia/Dubai')`,
      `a."entityType" = 'Lead'`, `a."action" IN ('lead.updated', 'lead.converted')`,
      `a."changes"->'status'->>'to' IN ('Won', 'Lost')`, 'l."archivedAt" IS NULL', closedScope,
    ];
    if (query.status === 'Won' || query.status === 'Lost') closedWhere.push(`a."changes"->'status'->>'to' = ${closedParam(query.status)}`);
    if (query.clientId) closedWhere.push(`l."clientId" = ${closedParam(query.clientId)}`);
    const closed = await this.pool.query<Row>(
      `SELECT a."changes"->'status'->>'to' AS "status", count(*)::int AS "count",
              coalesce(sum(l."estimatedValue"), 0)::int AS "value"
       FROM "AuditLog" a JOIN "Lead" l ON l."id"::text = a."entityId"
       WHERE ${closedWhere.join(' AND ')} GROUP BY a."changes"->'status'->>'to' ORDER BY 1`, closedValues,
    );
    const won = Number(closed.rows.find((row) => row['status'] === 'Won')?.['count'] ?? 0);
    const lost = Number(closed.rows.find((row) => row['status'] === 'Lost')?.['count'] ?? 0);
    return {
      from: range.from, to: range.to, pipeline: pipeline.rows,
      closedInPeriod: { won, lost, conversionRate: won + lost ? Math.round((won / (won + lost)) * 10000) / 100 : 0 },
      closedValueByStatus: closed.rows,
    };
  }

  private tables(name: ReportName, data: Record<string, unknown>, labels: Record<string, string>): { name: string; columns: { key: string; label: string; width?: number }[]; rows: Row[] }[] {
    const columns = (keys: string[]) => keys.map((key) => ({ key, label: labels[key] ?? key }));
    const rows = (key: string) => (data[key] as Row[] | undefined) ?? [];
    switch (name) {
      case 'time-by-employee': return [{ name: labels.timeByEmployee!, columns: columns(['employee', 'client', 'hours']), rows: rows('rows').map((r) => ({ ...r, hours: Math.round(Number(r['minutes']) / 60 * 100) / 100 })) }];
      case 'time-by-client': return [{ name: labels.timeByClient!, columns: columns(['client', 'taskType', 'hours']), rows: rows('rows').map((r) => ({ ...r, hours: Math.round(Number(r['minutes']) / 60 * 100) / 100 })) }];
      case 'task-status': return [
        { name: labels.taskStatus!, columns: columns(['status', 'taskType', 'count']), rows: rows('byStatusAndType') },
        { name: labels.overdue!, columns: columns(['id', 'title', 'client', 'taskType', 'status', 'dueDate']), rows: rows('overdue') },
      ];
      case 'expiring-documents': return [{ name: labels.expiringDocuments!, columns: columns(['client', 'type', 'number', 'expiryDate', 'daysLeft']), rows: rows('rows') }];
      case 'leads-pipeline': return [
        { name: labels.leadsPipeline!, columns: columns(['status', 'count', 'value']), rows: rows('pipeline') },
        { name: labels.closedInPeriod!, columns: columns(['status', 'count', 'value']), rows: rows('closedValueByStatus') },
      ];
    }
  }

  private excelValue(key: string, value: Row[string]) {
    if (['workDate', 'dueDate', 'expiryDate'].includes(key) && typeof value === 'string') {
      const [year, month, day] = value.split('-').map(Number);
      return new Date(Date.UTC(year, month - 1, day));
    }
    return value ?? null;
  }
}

function columnName(index: number) {
  let value = index;
  let label = '';
  while (value > 0) {
    value--;
    label = String.fromCharCode(65 + value % 26) + label;
    value = Math.floor(value / 26);
  }
  return label;
}

const EXCEL_LABELS: Record<ReportLanguage, Record<string, string>> = {
  en: {
    timeByEmployee: 'Time by employee', timeByClient: 'Time by client', taskStatus: 'Task status',
    expiringDocuments: 'Expiring documents', leadsPipeline: 'Leads pipeline', overdue: 'Overdue tasks', closedInPeriod: 'Won and lost in period',
    employee: 'Employee', client: 'Client', taskType: 'Task type', hours: 'Hours', status: 'Status', count: 'Count', value: 'Value (AED)',
    id: 'Task ID', title: 'Task', dueDate: 'Due date', type: 'Document type', number: 'Document number', expiryDate: 'Expiry date', daysLeft: 'Days left',
  },
  ar: {
    timeByEmployee: 'الوقت حسب الموظف', timeByClient: 'الوقت حسب العميل', taskStatus: 'حالة المهام',
    expiringDocuments: 'المستندات التي توشك على الانتهاء', leadsPipeline: 'مسار العملاء المحتملين', overdue: 'المهام المتأخرة', closedInPeriod: 'المكسب والخسارة خلال الفترة',
    employee: 'الموظف', client: 'العميل', taskType: 'نوع المهمة', hours: 'الساعات', status: 'الحالة', count: 'العدد', value: 'القيمة (درهم)',
    id: 'رقم المهمة', title: 'المهمة', dueDate: 'تاريخ الاستحقاق', type: 'نوع المستند', number: 'رقم المستند', expiryDate: 'تاريخ الانتهاء', daysLeft: 'الأيام المتبقية',
  },
};
