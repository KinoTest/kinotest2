import { z } from 'zod'

// To add a role (e.g. 'editor'): add it here and in rolePermissions below.
export const roleSchema = z.enum(['owner', 'user'])
export type Role = z.infer<typeof roleSchema>

export const permissionSchema = z.enum(['content:read', 'content:manage', 'users:manage'])
export type Permission = z.infer<typeof permissionSchema>

export const rolePermissions: Record<Role, readonly Permission[]> = {
  owner: ['content:read', 'content:manage', 'users:manage'],
  user: ['content:read'],
}

export const can = (role: Role, permission: Permission): boolean =>
  rolePermissions[role].includes(permission)
