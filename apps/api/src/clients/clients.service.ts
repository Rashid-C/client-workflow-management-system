import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { problem } from '../common/errors.js';
import type { Pool } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import type { AuthUser } from '../auth/session.js';
import { POSTGRES_POOL } from '../database/database.module.js';

export interface Client {
  id: number;
  clientCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateClientDto {
  clientCode: string;
  name: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address?: string;
  notes?: string;
}

@Injectable()
export class ClientsService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async findAll(viewer: AuthUser): Promise<Client[]> {
    // "own" scope: clients of tasks the viewer created or holds a stage of.
    const ownOnly = viewer.permissions['clients.view'] === 'own';
    const result = await this.pool.query<Client>(
      `SELECT c.* FROM "Client" c
       ${
         ownOnly
           ? `WHERE EXISTS (
                SELECT 1 FROM "Task" t
                WHERE t."clientId" = c."id"
                  AND (t."createdById" = $1 OR EXISTS (
                    SELECT 1 FROM "TaskStage" s
                    WHERE s."taskId" = t."id" AND s."assigneeId" = $1)))`
           : ''
       }
       ORDER BY c."id" ASC`,
      ownOnly ? [viewer.employeeId] : [],
    );

    return result.rows;
  }

  async create(data: CreateClientDto, context: AuditContext): Promise<Client> {
    const connection = await this.pool.connect();

    try {
      await connection.query('BEGIN');

      const result = await connection.query<Client>(
        `INSERT INTO "Client"
    ("clientCode", "name", "email", "phone", "companyName", "address", "notes", "updatedAt")
   VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
   RETURNING *`,
        [
          data.clientCode,
          data.name,
          data.email ?? null,
          data.phone ?? null,
          data.companyName ?? null,
          data.address ?? null,
          data.notes ?? null,
        ],
      );

      const client = result.rows[0];

      await this.audit.record(connection, context, {
        action: 'client.created',
        entityType: 'Client',
        entityId: client.id,
        summary: `Added client ${client.name} (${client.clientCode})`,
        changes: {
          clientCode: client.clientCode,
          name: client.name,
          email: client.email,
          phone: client.phone,
          companyName: client.companyName,
          address: client.address,
        },
      });

      await connection.query('COMMIT');
      return client;
    } catch (error: unknown) {
      await connection.query('ROLLBACK');

      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException(problem('clients.code_taken', 'Client code already exists'));
      }

      throw error;
    } finally {
      connection.release();
    }
  }
}
