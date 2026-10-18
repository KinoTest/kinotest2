import { createHash, randomBytes } from 'node:crypto'
import { roleSchema, type Role } from '@kinotest/shared'
import jwt from 'jsonwebtoken'
import { env } from '../env.ts'

export const newToken = (): string => randomBytes(32).toString('base64url')
export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

export const signAccess = (user: { id: string; role: Role }): string =>
  jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '15m',
    algorithm: 'HS256',
  })

export function verifyAccess(token: string): { userId: string; role: Role } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] })
    if (typeof payload === 'string' || !payload.sub) return null
    const role = roleSchema.safeParse(payload.role)
    return role.success ? { userId: payload.sub, role: role.data } : null
  } catch {
    return null
  }
}
