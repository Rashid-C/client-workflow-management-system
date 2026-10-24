import ExcelJS from 'exceljs';
import type { AuthUser } from '../auth/session.js';
import { officeDateRange, ReportsService } from './reports.service.js';

const viewer = (permissions: AuthUser['permissions']): AuthUser => ({
  employeeId: 17,
  employeeCode: 'EMP-017',
  name: 'Report Viewer',
  email: 'viewer@example.test',
  mustChangePassword: false,
  preferredLanguage: 'en',
  emailNotificationsEnabled: true,
  isSuperAdmin: false,
  permissions,
  sessionId: 29,
});

describe('ReportsService', () => {
  it('uses the viewer employee id for own time rows even when another employee filter is requested', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const service = new ReportsService(pool as never);
    await service.getReport('time-by-employee', viewer({ 'reports.view': 'own' }), {
      from: '2026-06-01', to: '2026-06-30', employeeId: 42,
    });
    expect(pool.query.mock.calls[0][0]).toContain('te."employeeId" = $3');
    expect(pool.query.mock.calls[0][1]).toEqual(['2026-06-01', '2026-06-30', 17]);
  });

  it('uses reports.export scope independently and limits own document rows through the client scope', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const service = new ReportsService(pool as never);
    await service.getReport('expiring-documents', viewer({ 'reports.view': 'all', 'reports.export': 'own' }), {
      from: '2026-06-15', to: '2026-06-29', days: 14,
    }, 'reports.export');
    expect(pool.query.mock.calls[0][0]).toContain('c."accountManagerId" = $4');
    expect(pool.query.mock.calls[0][0]).toContain('cs."assigneeId" = $4');
    expect(pool.query.mock.calls[0][1]).toEqual(['2026-06-15', '2026-06-29', officeDateRange().today, 17]);
  });

  it('restricts own task and lead reports in their SQL predicates', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const service = new ReportsService(pool as never);
    const ownViewer = viewer({ 'reports.view': 'own' });
    await service.getReport('task-status', ownViewer, { from: '2026-06-01', to: '2026-06-30' });
    expect(pool.query.mock.calls[0][0]).toContain('t."createdById" = $3');
    expect(pool.query.mock.calls[0][0]).toContain('os."assigneeId" = $3');
    expect(pool.query.mock.calls[0][1]).toEqual(['2026-06-01', '2026-07-01', 17]);

    pool.query.mockClear();
    await service.getReport('leads-pipeline', ownViewer, { from: '2026-06-01', to: '2026-06-30' });
    expect(pool.query.mock.calls[0][0]).toContain('l."ownerId" = $3');
    expect(pool.query.mock.calls[0][0]).toContain('l."createdById" = $3');
    expect(pool.query.mock.calls[1][0]).toContain('l."ownerId" = $3');
    expect(pool.query.mock.calls[1][1]).toEqual(['2026-06-01', '2026-07-01', 17]);
  });

  it('scopes filter choices: own viewers get only their clients and no employee list', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{ id: 1, name: 'X' }] }) };
    const service = new ReportsService(pool as never);
    const own = await service.filters(viewer({ 'reports.view': 'own' }));
    const clientCall = pool.query.mock.calls.find(([sql]) => String(sql).includes('FROM "Client"'));
    expect(clientCall?.[0]).toContain('c."accountManagerId" = $1');
    expect(clientCall?.[1]).toEqual([17]);
    expect(pool.query.mock.calls.some(([sql]) => String(sql).includes('FROM "Employee"'))).toBe(false);
    expect(own.employees).toEqual([]);

    pool.query.mockClear();
    const all = await service.filters(viewer({ 'reports.view': 'all' }));
    const allClients = pool.query.mock.calls.find(([sql]) => String(sql).includes('FROM "Client"'));
    expect(allClients?.[0]).not.toContain('accountManagerId');
    expect(all.employees).toEqual([{ id: 1, name: 'X' }]);
  });

  it('uses the Dubai office date at midnight edges when choosing the current month', () => {
    expect(officeDateRange(new Date('2026-05-31T19:59:59.999Z'))).toEqual({
      from: '2026-05-01', to: '2026-05-31', today: '2026-05-31',
    });
    expect(officeDateRange(new Date('2026-05-31T20:00:00.000Z'))).toEqual({
      from: '2026-06-01', to: '2026-06-01', today: '2026-06-01',
    });
  });

  it('exports an open workbook with the localized header row, hours and real date cells', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [
      { employeeId: 17, employee: 'Report Viewer', clientId: 8, client: 'Al Noor', minutes: 90 },
    ] }) };
    const service = new ReportsService(pool as never);
    const buffer = await service.exportXlsx('time-by-employee', viewer({ 'reports.export': 'all' }), {
      from: '2026-06-01', to: '2026-06-30', lang: 'ar',
    }, 'ar');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(buffer) as never);
    const sheet = workbook.worksheets[0];
    expect([sheet.getCell('A1').value, sheet.getCell('B1').value, sheet.getCell('C1').value]).toEqual(['الموظف', 'العميل', 'الساعات']);
    expect(sheet.views[0].rightToLeft).toBe(true);
    expect(sheet.getCell('C2').value).toBe(1.5);
    expect(sheet.getColumn(3).numFmt).toBe('0.00');
  });

  it('writes expiry days into Excel as actual date values', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [
      { client: 'Al Noor', type: 'Trade licence', number: 'TL-9', expiryDate: '2026-06-22', daysLeft: 7 },
    ] }) };
    const service = new ReportsService(pool as never);
    const buffer = await service.exportXlsx('expiring-documents', viewer({ 'reports.export': 'all' }), {
      from: '2026-06-15', to: '2026-06-30',
    }, 'en');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(buffer) as never);
    expect(workbook.worksheets[0].getCell('D2').value).toBeInstanceOf(Date);
  });
});
