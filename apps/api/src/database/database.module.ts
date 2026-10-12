
import { Global, Module } from '@nestjs/common';
import { Pool } from 'pg';

export const POSTGRES_POOL = Symbol('POSTGRES_POOL');

@Global()
@Module({
  providers: [
    {
      provide: POSTGRES_POOL,
      useFactory: () => {
        const connectionString = process.env['DATABASE_URL'];

        if (!connectionString) {
          throw new Error(
            'DATABASE_URL must be set to connect to PostgreSQL',
          );
        }

        return new Pool({
          connectionString,
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        });
      },
    },
  ],
  exports: [POSTGRES_POOL],
})
export class DatabaseModule {}
