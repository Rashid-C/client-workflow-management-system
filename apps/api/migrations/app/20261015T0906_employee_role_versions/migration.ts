#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/3595b91d77763d673cbf1d4ca39591cb87ebb8105ebaa388e14969b139bb7e65/contract';
import endContract from '../../snapshots/3595b91d77763d673cbf1d4ca39591cb87ebb8105ebaa388e14969b139bb7e65/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/dfebfa55f371304fa5cc9c08b9072370bae7890cfa152276bd92f0236229d907/contract';
import startContract from '../../snapshots/dfebfa55f371304fa5cc9c08b9072370bae7890cfa152276bd92f0236229d907/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Employee',
        column: col('version', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
      this.addColumn({
        schema: 'public',
        table: 'Role',
        column: col('version', 'int4', {
          notNull: true,
          default: lit(1),
          codecRef: { codecId: 'pg/int4@1' },
        }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
