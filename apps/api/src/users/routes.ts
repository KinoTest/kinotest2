import { userListQuerySchema } from '@kinotest/shared'
import { Router, type Request } from 'express'
import { requireAuth, requirePermission } from '../auth/middleware.ts'
import { userService } from './service.ts'

export const usersRouter = Router()

usersRouter.use(requireAuth, requirePermission('users:manage'))

// Up to 200 users, newest first; ?search= filters by email (case-insensitive, contains).
usersRouter.get('/', async (req, res) => {
  const query = userListQuerySchema.safeParse(req.query)
  if (!query.success) {
    res.status(400).json({ error: 'invalid_request', issues: query.error.issues })
    return
  }
  res.json(await userService.list(query.data.search))
})

usersRouter.get('/:id', async (req: Request<{ id: string }>, res) => {
  const user = await userService.get(req.params.id)
  if (!user) {
    res.status(404).json({ error: 'Non atopado' })
    return
  }
  res.json(user)
})
