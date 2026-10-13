import { Inject, Injectable, ConflictException } from '@nestjs/common';
import type { Pool } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
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

  async findAll(): Promise<Client[]> {
    const result = await this.pool.query<Client>(
      'SELECT * FROM "Client" ORDER BY "id" ASC',
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
        throw new ConflictException('Client code already exists');
      }

      throw error;
    } finally {
      connection.release();
    }
  }
}
