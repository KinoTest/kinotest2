import cors from 'cors'
import express from 'express'
import { authRouter } from './auth/routes.ts'
import { env } from './env.ts'
import { contentRouter } from './routes/content.ts'
import type { NextFunction, Request, Response } from 'express'


export const app = express()

app.set('trust proxy', 1)
app.use(cors({ origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()) }))
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
app.use('/api/auth', authRouter)
app.use('/api/content', contentRouter)
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Erro interno' })
})
