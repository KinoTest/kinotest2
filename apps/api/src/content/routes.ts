import { contentItemInputSchema, contentItemUpdateSchema } from '@kinotest/shared'
import { Router, type Request } from 'express'
import { getAuth, requireAuth, requirePermission } from '../auth/middleware.ts'
import { validate } from '../middleware.ts'
import { contentService } from './service.ts'

export const contentRouter = Router()

contentRouter.use(requireAuth)

contentRouter.get('/', requirePermission('content:read'), async (_req, res) => {
  res.json(await contentService.list())
})

contentRouter.post(
  '/',
  requirePermission('content:manage'),
  validate(contentItemInputSchema),
  async (req, res) => {
    res.status(201).json(await contentService.create(req.body, getAuth(res).userId))
  },
)

contentRouter.patch(
  '/:id',
  requirePermission('content:manage'),
  validate(contentItemUpdateSchema),
  async (req: Request<{ id: string }>, res) => {
    const item = await contentService.update(req.params.id, req.body)
    if (!item) {
      res.status(404).json({ error: 'Non atopado' })
      return
    }
    res.json(item)
  },
)

contentRouter.delete('/:id', requirePermission('content:manage'), async (req: Request<{ id: string }>, res) => {
  if (!(await contentService.remove(req.params.id))) {
    res.status(404).json({ error: 'Non atopado' })
    return
  }
  res.status(204).end()
})
