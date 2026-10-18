import type { NextFunction, Request, Response } from 'express'
import type { z } from 'zod'
import { can, type Permission, type Role } from '@kinotest/shared'

declare global {
  namespace Express {
    interface Request {
      // Set by the authentication step (to be implemented)
      user?: { id: string; role: Role }
    }
  }
}

export const validate =
  (schema: z.ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      res.status(400).json({ error: 'invalid_request', issues: result.error.issues })
      return
    }
    req.body = result.data
    next()
  }

export const requirePermission =
  (permission: Permission) => (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: 'unauthenticated' })
      return
    }
    if (!can(req.user.role, permission)) {
      res.status(403).json({ error: 'forbidden' })
      return
    }
    next()
  }
