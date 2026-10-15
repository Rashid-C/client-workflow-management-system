import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Pool, PoolClient } from 'pg';
import { AuditService, type AuditContext } from '../audit/audit.service.js';
import { problem } from '../common/errors.js';
import { POSTGRES_POOL } from '../database/database.module.js';
import type { SaveRoleDto, UpdateRoleDto } from './dto.js';
import {
  PERMISSIONS,
  type PermissionKey,
  type PermissionScope,
} from './permissions.js';

export interface RolePermissionGrant {
  key: PermissionKey;
  scope: PermissionScope;
}

export interface Role {
  id: number;
  name: string;
  description: string | null;
  isSystem: boolean;
  version: number;
  memberCount: number;
  permissions: RolePermissionGrant[];
}

const SELECT_ROLES = `
  SELECT r."id", r."name", r."description", r."isSystem", r."version",
         (SELECT count(*)::int FROM "EmployeeRole" er WHERE er."roleId" = r."id") AS "memberCount",
         COALESCE(
           json_agg(
             json_build_object('key', p."permissionKey", 'scope', p."scope")
             ORDER BY p."permissionKey"
           ) FILTER (WHERE p."id" IS NOT NULL),
           '[]'
         ) AS "permissions"
  FROM "Role" r
  LEFT JOIN "RolePermission" p ON p."roleId" = r."id"`;

const SCOPED = new Map<string, boolean>(PERMISSIONS.map((p) => [p.key, p.scoped]));

/** "clients.view (own)" — how a grant reads in the history. */
const describe = (grant: RolePermissionGrant) => `${grant.key} (${grant.scope})`;

@Injectable()
export class RolesService {
  constructor(
    @Inject(POSTGRES_POOL) private readonly pool: Pool,
    private readonly audit: AuditService,
  ) {}

  async findAll(): Promise<Role[]> {
    // One query for every role and its grants — no per-role round trips.
    const result = await this.pool.query<Role>(
      `${SELECT_ROLES} GROUP BY r."id" ORDER BY r."isSystem" DESC, lower(r."name")`,
    );
    return result.rows.map(withSystemGrants);
  }

  /** The permission catalogue the editor offers, in display order. */
  catalogue() {
    return PERMISSIONS.map(({ key, category, scoped }) => ({ key, category, scoped }));
  }

  async create(data: SaveRoleDto, context: AuditContext): Promise<Role> {
    const permissions = checkGrants(data.permissions);
    return this.transaction(async (db) => {
      const inserted = await db.query<{ id: number }>(
        `INSERT INTO "Role" ("name", "description", "updatedAt") VALUES ($1, $2, NOW()) RETURNING "id"`,
        [data.name, data.description ?? null],
      );
      const id = inserted.rows[0].id;
      await this.writeGrants(db, id, permissions);

      await this.audit.record(db, context, {
        action: 'role.created',
        entityType: 'Role',
        entityId: id,
        summary: `Created role ${data.name}`,
        changes: {
          name: data.name,
          description: data.description ?? null,
          permissions: permissions.map(describe),
        },
      });
      return (await this.load(db, id))!;
    });
  }

  async update(id: number, data: UpdateRoleDto, context: AuditContext): Promise<Role> {
    const permissions = checkGrants(data.permissions);
    return this.transaction(async (db) => {
      const current = await this.lockEditable(db, id);
      if (current.version !== data.version) {
        throw new ConflictException(
          problem('roles.stale', 'Someone else changed this role. Reload it and make your changes again.'),
        );
      }

      const changes: Record<string, unknown> = {};
      if (current.name !== data.name) changes['name'] = { from: current.name, to: data.name };
      const description = data.description ?? null;
      if (current.description !== description) {
        changes['description'] = { from: current.description, to: description };
      }
      const before = new Map(current.permissions.map((g) => [g.key, g.scope]));
      const after = new Map(permissions.map((g) => [g.key, g.scope]));
      const added = permissions.filter((g) => !before.has(g.key)).map(describe);
      const removed = current.permissions.filter((g) => !after.has(g.key)).map(describe);
      const rescoped = permissions
        .filter((g) => before.has(g.key) && before.get(g.key) !== g.scope)
        .map((g) => `${g.key}: ${before.get(g.key)} → ${g.scope}`);
      if (added.length) changes['permissionsAdded'] = added;
      if (removed.length) changes['permissionsRemoved'] = removed;
      if (rescoped.length) changes['scopeChanged'] = rescoped;
      if (!Object.keys(changes).length) return (await this.load(db, id))!;

      await db.query(
        `UPDATE "Role" SET "name" = $2, "description" = $3, "version" = "version" + 1, "updatedAt" = NOW()
         WHERE "id" = $1`,
        [id, data.name, description],
      );
      await db.query(`DELETE FROM "RolePermission" WHERE "roleId" = $1`, [id]);
      await this.writeGrants(db, id, permissions);

      await this.audit.record(db, context, {
        action: 'role.updated',
        entityType: 'Role',
        entityId: id,
        // Grants are read on every request, so this takes effect at once.
        summary: `Edited role ${data.name}`,
        changes,
      });
      return (await this.load(db, id))!;
    });
  }

  async remove(id: number, context: AuditContext): Promise<void> {
    await this.transaction(async (db) => {
      const current = await this.lockEditable(db, id);
      if (current.memberCount) {
        throw new BadRequestException(
          problem('roles.in_use', `${current.name} is held by ${current.memberCount} employee(s)`, {
            count: current.memberCount,
          }),
        );
      }
      await db.query(`DELETE FROM "Role" WHERE "id" = $1`, [id]);
      await this.audit.record(db, context, {
        action: 'role.deleted',
        entityType: 'Role',
        entityId: id,
        summary: `Deleted role ${current.name}`,
        changes: { permissions: current.permissions.map(describe) },
      });
    });
  }

  /** The role, locked; system roles cannot be changed. */
  private async lockEditable(db: PoolClient, id: number): Promise<Role> {
    const locked = await db.query(`SELECT 1 FROM "Role" WHERE "id" = $1 FOR UPDATE`, [id]);
    if (!locked.rowCount) throw new NotFoundException(problem('roles.not_found', 'Role not found'));
    const role = (await this.load(db, id))!;
    if (role.isSystem) {
      throw new BadRequestException(
        problem('roles.system_locked', 'The Super Admin role always has every permission and cannot be changed'),
      );
    }
    return role;
  }

  private async writeGrants(db: PoolClient, roleId: number, grants: RolePermissionGrant[]) {
    if (!grants.length) return;
    await db.query(
      `INSERT INTO "RolePermission" ("roleId", "permissionKey", "scope")
       SELECT $1, k, s FROM unnest($2::text[], $3::text[]) AS g(k, s)`,
      [roleId, grants.map((g) => g.key), grants.map((g) => g.scope)],
    );
  }

  private async load(db: PoolClient, id: number): Promise<Role | undefined> {
    const result = await db.query<Role>(`${SELECT_ROLES} WHERE r."id" = $1 GROUP BY r."id"`, [id]);
    return result.rows[0] && withSystemGrants(result.rows[0]);
  }

  private async transaction<T>(work: (db: PoolClient) => Promise<T>): Promise<T> {
    const connection = await this.pool.connect();
    try {
      await connection.query('BEGIN');
      const result = await work(connection);
      await connection.query('COMMIT');
      return result;
    } catch (error) {
      await connection.query('ROLLBACK');
      const { code, constraint } = error as { code?: string; constraint?: string };
      // Prisma suffixes index names with a hash (Role_name_lower_key_e40b0be1).
      if (code === '23505' && constraint?.startsWith('Role_name_lower_key')) {
        throw new ConflictException(problem('roles.name_taken', 'A role with this name already exists'));
      }
      if (code === '23503') {
        // Someone was given this role while it was being deleted.
        throw new BadRequestException(problem('roles.in_use', 'The role is held by an employee', { count: 1 }));
      }
      throw error;
    } finally {
      connection.release();
    }
  }
}

/** Each permission once; "own" only where the permission has a scope. */
function checkGrants(grants: RolePermissionGrant[]): RolePermissionGrant[] {
  const seen = new Set<string>();
  for (const grant of grants) {
    if (seen.has(grant.key)) {
      throw new BadRequestException(
        problem('roles.duplicate_permission', `${grant.key} is listed twice`, { permission: grant.key }),
      );
    }
    seen.add(grant.key);
    if (grant.scope === 'own' && !SCOPED.get(grant.key)) {
      throw new BadRequestException(
        problem('roles.scope_not_allowed', `${grant.key} cannot be limited to own records`, {
          permission: grant.key,
        }),
      );
    }
  }
  // Catalogue order, so the history and the editor list them the same way.
  const order = new Map(PERMISSIONS.map((p, i) => [p.key, i]));
  return [...grants].sort((a, b) => order.get(a.key)! - order.get(b.key)!);
}

// A system role holds the whole catalogue at "all" scope.
function withSystemGrants(role: Role): Role {
  if (!role.isSystem) return role;
  return { ...role, permissions: PERMISSIONS.map((p) => ({ key: p.key, scope: 'all' as const })) };
}
