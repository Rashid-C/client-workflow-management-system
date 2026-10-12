import { Inject, Injectable } from '@nestjs/common';
import type { Pool } from 'pg';
import { POSTGRES_POOL } from '../database/database.module.js';
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
  permissions: RolePermissionGrant[];
}

@Injectable()
export class RolesService {
  constructor(@Inject(POSTGRES_POOL) private readonly pool: Pool) {}

  async findAll(): Promise<Role[]> {
    // One query for every role and its grants — no per-role round trips.
    const result = await this.pool.query<Role>(
      `SELECT r."id", r."name", r."description", r."isSystem",
              COALESCE(
                json_agg(
                  json_build_object('key', p."permissionKey", 'scope', p."scope")
                  ORDER BY p."permissionKey"
                ) FILTER (WHERE p."id" IS NOT NULL),
                '[]'
              ) AS "permissions"
       FROM "Role" r
       LEFT JOIN "RolePermission" p ON p."roleId" = r."id"
       GROUP BY r."id"
       ORDER BY r."isSystem" DESC, r."name" ASC`,
    );

    return result.rows.map((role) =>
      role.isSystem ? { ...role, permissions: allPermissions() } : role,
    );
  }
}

// A system role holds the whole catalogue at "all" scope.
function allPermissions(): RolePermissionGrant[] {
  return PERMISSIONS.map((permission) => ({
    key: permission.key,
    scope: 'all',
  }));
}
