import { contentDocumentSchema } from '@kinotest/shared'
import { Router, type Request } from 'express'
import { getAuth, requireAuth, requirePermission } from '../auth/middleware.ts'
import { validate } from '../middleware.ts'
import { contentService } from './service.ts'

export const contentRouter = Router()

contentRouter.use(requireAuth)

// Summaries only (no `data`).
contentRouter.get('/', requirePermission('content:read'), async (_req, res) => {
  res.json(await contentService.list())
})

contentRouter.get('/:id', requirePermission('content:read'), async (req: Request<{ id: string }>, res) => {
  const item = await contentService.get(req.params.id)
  if (!item) {
    res.status(404).json({ error: 'Non atopado' })
    return
  }
  res.json(item)
})

contentRouter.post(
  '/',
  requirePermission('content:manage'),
  validate(contentDocumentSchema),
  async (req, res) => {
    const result = await contentService.create(req.body, getAuth(res).userId)
    if (result.status === 'conflict') {
      res.status(409).json({ error: 'Xa existe un contido con ese id e idioma' })
      return
    }
    res.status(201).json(result.item)
  },
)

// Replaces the whole document.
contentRouter.put(
  '/:id',
  requirePermission('content:manage'),
  validate(contentDocumentSchema),
  async (req: Request<{ id: string }>, res) => {
    const result = await contentService.replace(req.params.id, req.body)
    if (result.status === 'not_found') {
      res.status(404).json({ error: 'Non atopado' })
      return
    }
    if (result.status === 'conflict') {
      res.status(409).json({ error: 'Xa existe un contido con ese id e idioma' })
      return
    }
    res.json(result.item)
  },
)

contentRouter.delete('/:id', requirePermission('content:manage'), async (req: Request<{ id: string }>, res) => {
  if (!(await contentService.remove(req.params.id))) {
    res.status(404).json({ error: 'Non atopado' })
    return
  }
  res.status(204).end()
})
