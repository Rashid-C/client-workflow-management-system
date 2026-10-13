import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { DashboardService } from '../dashboard/dashboard.service.js';
import { TimeEntriesService } from './time-entries.service.js';

const viewer = (scope: 'own' | 'all', employeeId = 3): AuthUser => ({
  sessionId: 1,
  employeeId,
  employeeCode: 'EMP-003',
  name: 'Sam',
  email: 'sam@firm.ae',
  isSuperAdmin: false,
  mustChangePassword: false,
  permissions: { 'time_logs.view': scope, 'tasks.view': scope },
});

describe('TimeEntriesService', () => {
  let service: TimeEntriesService;
  let pool: { query: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    pool = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [TimeEntriesService, { provide: POSTGRES_POOL, useValue: pool }],
    }).compile();
    service = module.get(TimeEntriesService);
  });

  const pageCall = () => pool.query.mock.calls[0] as [string, unknown[]];
  const totalsCall = () => pool.query.mock.calls[1] as [string, unknown[]];

  it('shows staff only their own time, whatever employeeId they ask for', async () => {
    await service.list(viewer('own'), { employeeId: 9 });

    expect(pageCall()[0]).toContain('te."employeeId" = $1');
    expect(pageCall()[1][0]).toBe(3);
    expect(totalsCall()[1]).toEqual([3]);
  });

  it('lets managers filter by anyone', async () => {
    await service.list(viewer('all'), { employeeId: 9, clientId: 2, from: '2026-10-01', to: '2026-10-31' });

    expect(totalsCall()[1]).toEqual([9, 2, '2026-10-01', '2026-10-31']);
  });

  it('pages on (workDate, id) and totals the whole filter', async () => {
    pool.query
      .mockResolvedValueOnce({
        rows: [
          { id: 30, workDate: '2026-10-13', minutes: 60 },
          { id: 12, workDate: '2026-10-12', minutes: 30 },
          { id: 40, workDate: '2026-10-11', minutes: 15 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { id: 3, name: 'Sam', minutes: 200 },
          { id: 4, name: 'Alex', minutes: 45 },
        ],
      });

    const page = await service.list(viewer('all'), { limit: 2, before: '2026-10-14_99' });

    expect(pageCall()[0]).toContain('(te."workDate", te."id") < ($1::date, $2)');
    expect(pageCall()[1]).toEqual(['2026-10-14', 99, 3]);
    expect(totalsCall()[0]).not.toContain('te."id") <');
    expect(page.items).toHaveLength(2);
    expect(page.nextBefore).toBe('2026-10-12_12');
    expect(page.totalMinutes).toBe(245);
  });

  it('answers 400 for an impossible date', async () => {
    pool.query.mockRejectedValue({ code: '22008' });

    await expect(service.list(viewer('all'), { from: '2026-02-31' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('DashboardService', () => {
  it('shows the team overview only to people who see every task', async () => {
    const pool = { query: vi.fn().mockResolvedValue({ rows: [{}] }) };
    const module: TestingModule = await Test.createTestingModule({
      providers: [DashboardService, { provide: POSTGRES_POOL, useValue: pool }],
    }).compile();
    const dashboard = module.get(DashboardService);

    await expect(dashboard.get(viewer('own'))).resolves.toMatchObject({ team: null });
    expect(pool.query).toHaveBeenCalledTimes(2);

    pool.query.mockClear();
    const manager = await dashboard.get(viewer('all', 2));
    expect(manager.team).not.toBeNull();
    expect(pool.query).toHaveBeenCalledTimes(6);
  });
});
