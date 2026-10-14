#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/550b02fb5e30ae28ca1bc059765b3e93be77c801fd37b4957d9520c34ee2cfc8/contract';
import startContract from '../../snapshots/550b02fb5e30ae28ca1bc059765b3e93be77c801fd37b4957d9520c34ee2cfc8/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/8045fff9643ff004e4c768087ed0142d2dce8c94df6786c1a33a4c2aa4270796/contract';
import endContract from '../../snapshots/8045fff9643ff004e4c768087ed0142d2dce8c94df6786c1a33a4c2aa4270796/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, lit } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'Employee',
        column: col('preferredLanguage', 'text', {
          notNull: true,
          default: lit('en'),
          codecRef: { codecId: 'pg/text@1' },
        }),
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'Employee',
        constraint: 'Employee_preferredLanguage_check_e4285cbd',
        expression: `"preferredLanguage" IN ('en', 'ar')`,
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
