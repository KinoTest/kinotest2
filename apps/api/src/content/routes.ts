import { contentDocumentSchema, IMAGE_CONTENT_TYPE, presignRequestSchema, type PresignResponse } from '@kinotest/shared'
import { Router, type Request } from 'express'
import { getAuth, requireAuth, requirePermission } from '../auth/middleware.ts'
import { validate } from '../middleware.ts'
import { buildImageKey, imageStore } from '../media/index.ts'
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

// Presigned upload for an image: the browser PUTs the WebP straight to the bucket. The key is
// content-addressed, so an existing object is never uploaded twice.
contentRouter.post(
  '/images/presign',
  requirePermission('content:manage'),
  validate(presignRequestSchema),
  async (req, res) => {
    const { contentId, hash } = req.body as { contentId: string; hash: string }
    const key = buildImageKey(contentId, hash)
    if (await imageStore.exists(key)) {
      res.json({ key, exists: true } satisfies PresignResponse)
      return
    }
    const uploadUrl = await imageStore.createUploadUrl(key, IMAGE_CONTENT_TYPE)
    res.json({ key, exists: false, uploadUrl } satisfies PresignResponse)
  },
)

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
