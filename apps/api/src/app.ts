import cors from 'cors'
import express from 'express'
import type { NextFunction, Request, Response } from 'express'
import { authRouter } from './auth/routes.ts'
import { env } from './env.ts'
import { contentRouter } from './content/routes.ts'

export const app = express()

app.set('trust proxy', 1)
app.use(cors({ origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()) }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
app.use('/api/auth', authRouter)
app.use('/api/content', contentRouter)

// Must be last and keep the 4 parameters so Express treats it as an error handler.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const status = (err as { status?: number }).status
  if (typeof status === 'number' && status >= 400 && status < 500) {
    res.status(status).json({ error: 'Petición non válida' })
    return
  }
  console.error(err)
  res.status(500).json({ error: 'Erro interno' })
})