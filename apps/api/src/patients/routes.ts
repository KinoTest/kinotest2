import { createPatientSchema, patientPatchSchema } from '@kinotest/shared'
import { Router, type Request, type Response } from 'express'
import { getAuth } from '../auth/middleware.ts'
import { validate } from '../middleware.ts'
import { sessionsRouter } from '../sessions/routes.ts'
import { patientRepository as repo } from './repository.ts'

/** The signed-in therapist's own patients. Mounted at /api/me/patients, behind requireAuth (see me/routes.ts). */
export const patientsRouter = Router()

patientsRouter.use('/:patientId/sessions', sessionsRouter)

const notFound = (res: Response) => res.status(404).json({ error: 'Non atopado' })

// Without notes: the list only needs the names.
patientsRouter.get('/', async (_req, res) => {
  res.json(await repo.list(getAuth(res).userId))
})

patientsRouter.post('/', validate(createPatientSchema), async (req, res) => {
  res.status(201).json(await repo.create(getAuth(res).userId, req.body.name))
})

patientsRouter.get('/:id', async (req: Request<{ id: string }>, res) => {
  const patient = await repo.get(getAuth(res).userId, req.params.id)
  if (!patient) return void notFound(res)
  res.json(patient)
})

patientsRouter.patch('/:id', validate(patientPatchSchema), async (req: Request<{ id: string }>, res) => {
  const patient = await repo.update(getAuth(res).userId, req.params.id, req.body)
  if (!patient) return void notFound(res)
  res.json(patient)
})

patientsRouter.delete('/:id', async (req: Request<{ id: string }>, res) => {
  if (!(await repo.remove(getAuth(res).userId, req.params.id))) return void notFound(res)
  res.status(204).end()
})
