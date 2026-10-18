import { Router } from 'express'
import { contentItemInputSchema } from '@kinotest/shared'
import { prisma } from '../db.ts'
import { requirePermission, validate } from '../middleware.ts'

export const contentRouter = Router()

contentRouter.get('/', requirePermission('content:read'), async (_req, res) => {
  res.json(await prisma.contentItem.findMany({ orderBy: { createdAt: 'desc' } }))
})

contentRouter.post(
  '/',
  requirePermission('content:manage'),
  validate(contentItemInputSchema),
  async (req, res) => {
    const item = await prisma.contentItem.create({
      data: { ...req.body, authorId: req.user!.id },
    })
    res.status(201).json(item)
  },
)
