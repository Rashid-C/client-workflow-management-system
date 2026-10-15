import { readFileSync } from 'node:fs';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import { PERMISSIONS, isPermissionKey } from './permissions.js';
import { RolesService, type Role } from './roles.service.js';

const context: AuditContext = { actor: { employeeId: 1, name: 'Admin' }, ipAddress: '10.0.0.5' };

const staff: Role = {
  id: 3,
  name: 'Staff',
  description: 'Day-to-day work',
  isSystem: false,
  version: 2,
  memberCount: 0,
  permissions: [
    { key: 'clients.view', scope: 'own' },
    { key: 'tasks.view', scope: 'own' },
  ],
};

/** Answers each query by what its SQL asks for, and keeps every write. */
function fakeDatabase(role: Role | null = staff, failInsert?: object) {
  const writes: { sql: string; params: unknown[] }[] = [];
  const query = vi.fn(async (sql: string, params: unknown[] = []) => {
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(sql)) return {};
    if (sql.includes('FOR UPDATE')) return { rowCount: role ? 1 : 0, rows: role ? [{}] : [] };
    if (/^(INSERT|UPDATE|DELETE)/.test(sql.trim())) {
      writes.push({ sql, params });
      if (failInsert && sql.includes('INSERT INTO "Role"')) throw failInsert;
      return { rows: [{ id: 9 }] };
    }
    if (sql.includes('FROM "Role" r')) return { rows: role ? [role] : [] };
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { query, release: vi.fn(), writes };
}

async function serviceWith(db: ReturnType<typeof fakeDatabase>) {
  const record = vi.fn().mockResolvedValue(undefined);
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      RolesService,
      { provide: POSTGRES_POOL, useValue: { query: db.query, connect: vi.fn().mockResolvedValue(db) } },
      { provide: AuditService, useValue: { record } },
    ],
  }).compile();
  return { service: module.get(RolesService), record };
}

describe('RolesService', () => {
  it('gives a system role every permission at "all" scope', async () => {
    const db = fakeDatabase();
    const { service } = await serviceWith(db);
    db.query.mockResolvedValueOnce({
      rows: [{ ...staff, id: 1, name: 'Super Admin', isSystem: true, permissions: [] }, staff],
    } as never);

    const [superAdmin, other] = await service.findAll();

    expect(superAdmin.permissions).toHaveLength(PERMISSIONS.length);
    expect(superAdmin.permissions.every((p) => p.scope === 'all')).toBe(true);
    expect(other.permissions).toEqual(staff.permissions);
    expect(db.query).toHaveBeenCalledOnce();
  });

  describe('create', () => {
    it('stores the grants in catalogue order and records them', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.create(
        {
          name: 'Auditor',
          permissions: [
            { key: 'tasks.view', scope: 'all' },
            { key: 'clients.view', scope: 'own' },
          ],
        },
        context,
      );

      const grants = db.writes.find((w) => w.sql.includes('INSERT INTO "RolePermission"'))!;
      expect(grants.params).toEqual([9, ['clients.view', 'tasks.view'], ['own', 'all']]);
      expect(record.mock.calls[0][2]).toMatchObject({
        action: 'role.created',
        changes: { permissions: ['clients.view (own)', 'tasks.view (all)'] },
      });
    });

    it('refuses "own" on a permission that has no scope', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await expect(
        service.create({ name: 'Odd', permissions: [{ key: 'tasks.create', scope: 'own' }] }, context),
      ).rejects.toMatchObject({ response: { code: 'roles.scope_not_allowed', params: { permission: 'tasks.create' } } });
      expect(db.writes).toEqual([]);
    });

    it('refuses the same permission twice', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await expect(
        service.create(
          { name: 'Odd', permissions: [{ key: 'tasks.view', scope: 'own' }, { key: 'tasks.view', scope: 'all' }] },
          context,
        ),
      ).rejects.toMatchObject({ response: { code: 'roles.duplicate_permission' } });
    });

    it('reports a name already in use', async () => {
      const db = fakeDatabase(staff, { code: '23505', constraint: 'Role_name_lower_key_e40b0be1' });
      const { service, record } = await serviceWith(db);

      const failure = service.create({ name: 'staff', permissions: [] }, context);
      await expect(failure).rejects.toBeInstanceOf(ConflictException);
      await expect(failure).rejects.toMatchObject({ response: { code: 'roles.name_taken' } });
      expect(record).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('records added, removed and re-scoped permissions', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.update(
        3,
        {
          name: 'Staff',
          description: 'Day-to-day work',
          version: 2,
          permissions: [
            { key: 'tasks.view', scope: 'all' },
            { key: 'tasks.complete', scope: 'own' },
          ],
        },
        context,
      );

      expect(record.mock.calls[0][2].changes).toEqual({
        permissionsAdded: ['tasks.complete (own)'],
        permissionsRemoved: ['clients.view (own)'],
        scopeChanged: ['tasks.view: own → all'],
      });
      expect(db.writes.map((w) => w.sql.trim().split(' ')[0])).toEqual(['UPDATE', 'DELETE', 'INSERT']);
    });

    it('writes nothing when nothing changed', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.update(3, { ...staff, version: 2 }, context);

      expect(db.writes).toEqual([]);
      expect(record).not.toHaveBeenCalled();
    });

    it('refuses an edit based on an old version', async () => {
      const db = fakeDatabase();
      const { service } = await serviceWith(db);

      await expect(service.update(3, { ...staff, name: 'New', version: 1 }, context)).rejects.toMatchObject({
        response: { code: 'roles.stale' },
      });
      expect(db.writes).toEqual([]);
    });

    it('never changes the Super Admin role', async () => {
      const db = fakeDatabase({ ...staff, id: 1, isSystem: true });
      const { service } = await serviceWith(db);

      await expect(service.update(1, { ...staff, version: 2 }, context)).rejects.toMatchObject({
        response: { code: 'roles.system_locked' },
      });
    });
  });

  describe('remove', () => {
    it('refuses a role someone still holds', async () => {
      const db = fakeDatabase({ ...staff, memberCount: 4 });
      const { service } = await serviceWith(db);

      const failure = service.remove(3, context);
      await expect(failure).rejects.toBeInstanceOf(BadRequestException);
      await expect(failure).rejects.toMatchObject({ response: { code: 'roles.in_use', params: { count: 4 } } });
      expect(db.writes).toEqual([]);
    });

    it('deletes an unused role and records what it granted', async () => {
      const db = fakeDatabase();
      const { service, record } = await serviceWith(db);

      await service.remove(3, context);

      expect(db.writes[0].sql).toContain('DELETE FROM "Role"');
      expect(record.mock.calls[0][2]).toMatchObject({ action: 'role.deleted', entityId: 3 });
    });

    it('answers 404 for an unknown role', async () => {
      const db = fakeDatabase(null);
      const { service } = await serviceWith(db);

      await expect(service.remove(42, context)).rejects.toMatchObject({ response: { code: 'roles.not_found' } });
    });
  });
});

describe('permission catalogue', () => {
  it('has unique keys', () => {
    const keys = PERMISSIONS.map((permission) => permission.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  // The web app names each permission; a key without a label would show raw.
  it.each(['en', 'ar'])('has a label for every permission in the %s dictionary', (language) => {
    const text = readFileSync(new URL(`../../../web/lib/i18n/${language}.ts`, import.meta.url), 'utf8');
    const missing = PERMISSIONS.filter((p) => !text.includes(`"${p.key}":`)).map((p) => p.key);
    expect(missing).toEqual([]);
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
