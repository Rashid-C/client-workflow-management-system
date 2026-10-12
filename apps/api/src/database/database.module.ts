import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import pg from 'pg';

export const POSTGRES_POOL = Symbol('POSTGRES_POOL');

// Return `date` columns as their 'YYYY-MM-DD' text. pg's default turns them
// into a JS Date at local midnight, which shifts the day once the value
// crosses a time zone (the office runs on Asia/Dubai, UTC+4).
const types = {
  getTypeParser: ((oid: number, format?: 'text' | 'binary') =>
    oid === pg.types.builtins.DATE
      ? (value: string) => value
      : pg.types.getTypeParser(oid, format)) as typeof pg.types.getTypeParser,
};

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

        return new pg.Pool({
          connectionString,
          types,
          max: 10,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 5_000,
        });
      },
    },
  ],
  exports: [POSTGRES_POOL],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
