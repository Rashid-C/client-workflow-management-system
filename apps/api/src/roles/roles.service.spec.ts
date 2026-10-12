import { readFileSync } from 'node:fs';
import { Test, TestingModule } from '@nestjs/testing';
import { POSTGRES_POOL } from '../database/database.module.js';
import { PERMISSIONS, isPermissionKey } from './permissions.js';
import { RolesService } from './roles.service.js';

describe('RolesService', () => {
  let service: RolesService;
  let pool: { query: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    pool = { query: vi.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [RolesService, { provide: POSTGRES_POOL, useValue: pool }],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('gives a system role every permission at "all" scope', async () => {
    pool.query.mockResolvedValue({
      rows: [
        { id: 1, name: 'Super Admin', description: null, isSystem: true, permissions: [] },
        {
          id: 3,
          name: 'Staff',
          description: null,
          isSystem: false,
          permissions: [{ key: 'tasks.view', scope: 'own' }],
        },
      ],
    });

    const [superAdmin, staff] = await service.findAll();

    expect(superAdmin.permissions).toHaveLength(PERMISSIONS.length);
    expect(superAdmin.permissions.every((p) => p.scope === 'all')).toBe(true);
    expect(staff.permissions).toEqual([{ key: 'tasks.view', scope: 'own' }]);
    expect(pool.query).toHaveBeenCalledOnce();
  });
});

describe('permission catalogue', () => {
  it('has unique keys', () => {
    const keys = PERMISSIONS.map((permission) => permission.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // The roles migration seeds permission keys as SQL text. If the catalogue
  // ever drops or renames a key, this catches the stale seed.
  it('knows every permission key the roles migration seeds', () => {
    const migration = readFileSync(
      new URL(
        '../../migrations/app/20261012T1855_add_roles_and_permissions/migration.ts',
        import.meta.url,
      ),
      'utf8',
    );
    const seeded = [
      ...migration.matchAll(/\('(?:Manager|Staff)', '([a-z_.]+)', '(own|all)'\)/g),
    ];

    expect(seeded).toHaveLength(42);
    for (const [, key, scope] of seeded) {
      expect(isPermissionKey(key), key).toBe(true);
      if (scope === 'own') {
        expect(
          PERMISSIONS.find((permission) => permission.key === key)?.scoped,
          `${key} is seeded as "own" but is not scoped`,
        ).toBe(true);
      }
    }
  });
});
