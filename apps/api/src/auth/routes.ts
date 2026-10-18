import {
  refreshSchema,
  requestLinkSchema,
  verifyLinkSchema,
} from '@kinotest/shared'
import { Router, type NextFunction, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import { ZodError } from 'zod'
import { getAuth, requireAuth } from './middleware.ts'
import { AuthError, authService } from './service.ts'
import { env } from '../../../api/src/env.ts'

export const authRouter = Router()

const linkLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.LINK_RATE_LIMIT_PER_IP,
  standardHeaders: true,
  legacyHeaders: false,
})

// Express 5 forwards rejected promises to the error handler below.
authRouter.post('/request-link', linkLimiter, async (req, res) => {
  const { email } = requestLinkSchema.parse(req.body)
  await authService.requestLink(email)
  res.status(202).json({ ok: true })
})

authRouter.post('/verify', async (req, res) => {
  const { token } = verifyLinkSchema.parse(req.body)
  res.json(await authService.verifyLink(token))
})

authRouter.post('/refresh', async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body)
  res.json(await authService.refresh(refreshToken))
})

authRouter.post('/logout', async (req, res) => {
  const { refreshToken } = refreshSchema.parse(req.body)
  await authService.logout(refreshToken)
  res.status(204).end()
})

authRouter.get('/me', requireAuth, async (_req, res) => {
  res.json(await authService.me(getAuth(res).userId))
})

authRouter.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos non válidos' })
    return
  }
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message })
    return
  }
  next(err)
})
