import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig } from '@prisma/orm-postgres/config';

// Explicit annotation: the inferred type references PrismaNextConfig from the
// transitive @prisma/orm-framework package, which `declaration: true` can't name (TS2883).
type PrismaConfig = ReturnType<typeof definePrismaConfig<{ orm: ReturnType<typeof ormConfig> }>>;

const config: PrismaConfig = definePrismaConfig({
  orm: ormConfig({
    contract: './src/prisma/contract.prisma',
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
});

export default config;
