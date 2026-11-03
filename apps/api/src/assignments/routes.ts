import {
  assignmentListQuerySchema,
  assignmentPatchSchema,
  createAssignmentsSchema,
  deleteAssignmentsSchema,
} from '@kinotest/shared'
import { Router, type Request } from 'express'
import { getAuth, requireAuth, requirePermission } from '../auth/middleware.ts'
import { validate } from '../middleware.ts'
import { assignmentService } from './service.ts'

export const assignmentsRouter = Router()

assignmentsRouter.use(requireAuth, requirePermission('assignments:manage'))

// ?userId= (therapies of a therapist) and/or ?contentItemId= (therapists of a therapy).
assignmentsRouter.get('/', async (req, res) => {
  const query = assignmentListQuerySchema.safeParse(req.query)
  if (!query.success) {
    res.status(400).json({ error: 'invalid_request', issues: query.error.issues })
    return
  }
  res.json(await assignmentService.list(query.data))
})

// Batch: every therapist x every therapy. Existing pairs are skipped, not overwritten.
assignmentsRouter.post('/', validate(createAssignmentsSchema), async (req, res) => {
  const result = await assignmentService.create(req.body, getAuth(res).userId)
  if (result.status === 'not_found') {
    res.status(404).json({ error: 'Algún terapeuta ou terapia non existe' })
    return
  }
  res.status(201).json({ created: result.created, skipped: result.skipped })
})

assignmentsRouter.delete('/', validate(deleteAssignmentsSchema), async (req, res) => {
  res.json({ deleted: await assignmentService.remove(req.body) })
})

assignmentsRouter.patch('/:id', validate(assignmentPatchSchema), async (req: Request<{ id: string }>, res) => {
  const item = await assignmentService.update(req.params.id, req.body)
  if (!item) {
    res.status(404).json({ error: 'Non atopado' })
    return
  }
  res.json(item)
})
