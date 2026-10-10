import { Inject, Injectable, ConflictException } from '@nestjs/common';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from './postgres-pool.token.js';

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
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<Client[]> {
    const result = await this.pool.query<Client>(
      'SELECT * FROM "Client" ORDER BY "id" ASC',
    );

    return result.rows;
  }

  async create(data: CreateClientDto): Promise<Client> {
    try {
      const result = await this.pool.query<Client>(
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

      return result.rows[0];
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === '23505'
      ) {
        throw new ConflictException('Client code already exists');
      }

      throw error;
    }
  }
}
