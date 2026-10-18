import { can, type Permission, type Role } from '@kinotest/shared'
import type { RequestHandler, Response } from 'express'
import { verifyAccess } from './tokens.ts'

export const getAuth = (res: Response): { userId: string; role: Role } => res.locals.auth

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization
  const auth = header?.startsWith('Bearer ') ? verifyAccess(header.slice(7)) : null
  if (!auth) {
    res.status(401).json({ error: 'Non autenticado' })
    return
  }
  res.locals.auth = auth
  next()
}

// Use after requireAuth: router.post('/x', requireAuth, requirePermission('content:manage'), handler)
export const requirePermission =
  (permission: Permission): RequestHandler =>
  (_req, res, next) => {
    if (!can(getAuth(res).role, permission)) {
      res.status(403).json({ error: 'Sen permisos' })
      return
    }
    next()
  }
