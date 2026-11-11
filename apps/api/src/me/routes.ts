import { Router, type Request } from 'express'
import { assignmentService } from '../assignments/service.ts'
import { getAuth, requireAuth } from '../auth/middleware.ts'
import { patientsRouter } from '../patients/routes.ts'

export const meRouter = Router()

meRouter.use(requireAuth)
meRouter.use('/patients', patientsRouter)

// What the signed-in therapist can read: assigned and not expired. Never includes note or amount.
meRouter.get('/therapies', async (_req, res) => {
  res.json(await assignmentService.listMine(getAuth(res).userId))
})

meRouter.get('/therapies/:id', async (req: Request<{ id: string }>, res) => {
  const item = await assignmentService.getMine(getAuth(res).userId, req.params.id)
  if (!item) {
    res.status(404).json({ error: 'Non atopado' })
    return
  }
  res.json(item)
})
