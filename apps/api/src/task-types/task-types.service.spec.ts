import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { TaskTypesService, type TaskType } from './task-types.service.js';

describe('TaskTypesService', () => {
  let service: TaskTypesService;
  let pool: { query: ReturnType<typeof vi.fn>; connect: ReturnType<typeof vi.fn> };
  let connection: { query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> };
  let record: ReturnType<typeof vi.fn>;

  const context: AuditContext = { actor: { employeeId: 1, name: 'Admin' } };

  const icv: TaskType = {
    id: 3,
    name: 'ICV',
    description: 'In-Country Value certification',
    isActive: true,
    version: 2,
    stages: [
      { position: 1, name: 'Document collection' },
      { position: 2, name: 'ICV calculation' },
    ],
  };

  const sql = () => connection.query.mock.calls.map(([text]) => String(text));

  beforeEach(async () => {
    connection = { query: vi.fn(), release: vi.fn() };
    pool = { query: vi.fn(), connect: vi.fn().mockResolvedValue(connection) };
    record = vi.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskTypesService,
        { provide: POSTGRES_POOL, useValue: pool },
        { provide: AuditService, useValue: { record } },
      ],
    }).compile();
    service = module.get(TaskTypesService);
  });

  describe('findAll', () => {
    it('hides inactive types unless asked, in one query', async () => {
      pool.query.mockResolvedValue({ rows: [icv] });

      await service.findAll();
      expect(pool.query.mock.calls[0][0]).toContain('WHERE t."isActive"');

      await service.findAll(true);
      expect(pool.query.mock.calls[1][0]).not.toContain('WHERE t."isActive"');
    });
  });

  describe('create', () => {
    it('stores trimmed names and stages in order, and records it', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ id: 9 }] }) // INSERT type
        .mockResolvedValueOnce({}) // INSERT stages
        .mockResolvedValueOnce({ rows: [{ ...icv, id: 9 }] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await service.create(
        { name: ' VAT Return ', description: '  ', stages: [' Records ', 'Filing'] },
        context,
      );

      expect(connection.query.mock.calls[1][1]).toEqual(['VAT Return', null]);
      expect(connection.query.mock.calls[2][1]).toEqual([9, ['Records', 'Filing']]);
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'task_type.created',
        entityType: 'TaskType',
        entityId: 9,
      });
      expect(sql().at(-1)).toBe('COMMIT');
    });

    it.each([
      [['Review', ' review '], 'appears more than once'],
      [['Review', '   '], 'cannot be blank'],
    ])('rejects stages %j before touching the database', async (stages, message) => {
      await expect(
        service.create({ name: 'X', stages }, context),
      ).rejects.toThrow(message);
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it('answers 409 for a name already in use (any case)', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce({ code: '23505' }) // INSERT type
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        service.create({ name: 'icv', stages: ['A'] }, context),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(sql().at(-1)).toBe('ROLLBACK');
      expect(connection.release).toHaveBeenCalledOnce();
    });
  });

  describe('update', () => {
    const save = (overrides = {}) => ({
      name: 'ICV',
      description: 'In-Country Value certification',
      isActive: true,
      version: 2,
      stages: ['Document collection', 'ICV calculation'],
      ...overrides,
    });

    const lockedAndLoaded = () =>
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 1 }) // FOR UPDATE
        .mockResolvedValueOnce({ rows: [icv] }); // current

    it('returns 404 for an unknown type', async () => {
      connection.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rowCount: 0 }) // FOR UPDATE
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.update(99, save(), context)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('refuses a save based on an older version', async () => {
      lockedAndLoaded().mockResolvedValueOnce({}); // ROLLBACK

      await expect(
        service.update(3, save({ version: 1 }), context),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(sql().some((text) => text.includes('UPDATE "TaskType"'))).toBe(false);
      expect(record).not.toHaveBeenCalled();
    });

    it('writes nothing when nothing changed', async () => {
      lockedAndLoaded().mockResolvedValueOnce({}); // COMMIT

      await expect(service.update(3, save(), context)).resolves.toBe(icv);
      expect(sql().some((text) => text.includes('UPDATE "TaskType"'))).toBe(false);
      expect(record).not.toHaveBeenCalled();
    });

    it('replaces reordered stages, bumps the version and records before/after', async () => {
      lockedAndLoaded()
        .mockResolvedValueOnce({}) // UPDATE type
        .mockResolvedValueOnce({}) // DELETE stages
        .mockResolvedValueOnce({}) // INSERT stages
        .mockResolvedValueOnce({ rows: [icv] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await service.update(
        3,
        save({ stages: ['ICV calculation', 'Document collection', 'Review'] }),
        context,
      );

      expect(sql()).toContainEqual(expect.stringContaining('"version" = "version" + 1'));
      expect(sql()).toContainEqual(expect.stringContaining('DELETE FROM "TaskTypeStage"'));
      expect(record.mock.calls[0][2].changes).toEqual({
        stages: {
          from: ['Document collection', 'ICV calculation'],
          to: ['ICV calculation', 'Document collection', 'Review'],
        },
      });
    });

    it('keeps stages untouched when only the type is deactivated', async () => {
      lockedAndLoaded()
        .mockResolvedValueOnce({}) // UPDATE type
        .mockResolvedValueOnce({ rows: [{ ...icv, isActive: false }] }) // reload
        .mockResolvedValueOnce({}); // COMMIT

      await service.update(3, save({ isActive: false }), context);

      expect(sql().some((text) => text.includes('DELETE'))).toBe(false);
      expect(record.mock.calls[0][2].summary).toBe('Deactivated task type ICV');
    });

    it('validates input before locking anything', async () => {
      await expect(
        service.update(3, save({ stages: ['A', 'a'] }), context),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(pool.connect).not.toHaveBeenCalled();
    });
  });
});
