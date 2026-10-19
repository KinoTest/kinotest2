import type { NextFunction, Request, Response } from 'express'
import type { z } from 'zod'

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
