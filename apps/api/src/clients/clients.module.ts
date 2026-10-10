import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { ClientsController } from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import { POSTGRES_POOL } from './postgres-pool.token.js';

@Module({
  controllers: [ClientsController],
  providers: [
    {
      provide: POSTGRES_POOL,
      useFactory: () => {
        const connectionString = process.env['DATABASE_URL'];
        if (!connectionString) {
          throw new Error('DATABASE_URL must be set to connect to PostgreSQL');
        }

        return new Pool({ connectionString });
      },
    },
    ClientsService,
  ],
})
export class ClientsModule {}
