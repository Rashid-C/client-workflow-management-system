import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { ClientsService } from './clients.service.js';

describe('ClientsService', () => {
  let service: ClientsService;
  let connection: {
    query: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
  };
  let record: ReturnType<typeof vi.fn>;

  const context: AuditContext = {
    actor: { employeeId: 1, name: 'Maria Manager' },
    ipAddress: '10.0.0.5',
  };
  const input = { clientCode: 'GULF', name: 'Gulf Industries' };

  beforeEach(async () => {
    connection = { query: vi.fn(), release: vi.fn() };
    record = vi.fn().mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClientsService,
        {
          provide: POSTGRES_POOL,
          useValue: { query: vi.fn(), connect: vi.fn().mockResolvedValue(connection) },
        },
        { provide: AuditService, useValue: { record } },
      ],
    }).compile();

    service = module.get<ClientsService>(ClientsService);
  });

  it('records the new client in the same transaction', async () => {
    const client = { id: 7, clientCode: 'GULF', name: 'Gulf Industries', email: null };
    connection.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockResolvedValueOnce({ rows: [client] }) // INSERT
      .mockResolvedValueOnce({}); // COMMIT

    await expect(service.create(input, context)).resolves.toEqual(client);

    expect(record).toHaveBeenCalledWith(
      connection,
      context,
      expect.objectContaining({
        action: 'client.created',
        entityType: 'Client',
        entityId: 7,
      }),
    );
    expect(connection.query.mock.calls.at(-1)?.[0]).toBe('COMMIT');
    expect(connection.release).toHaveBeenCalledOnce();
  });

  it('rolls back a duplicate code without an audit entry', async () => {
    connection.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce({ code: '23505' }) // INSERT
      .mockResolvedValueOnce({}); // ROLLBACK

    await expect(service.create(input, context)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(record).not.toHaveBeenCalled();
    expect(connection.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(connection.release).toHaveBeenCalledOnce();
  });
});
