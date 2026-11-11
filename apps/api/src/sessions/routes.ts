import { createSessionSchema, sessionPatchSchema } from '@kinotest/shared'
import { Router, type Request, type Response } from 'express'
import { getAuth } from '../auth/middleware.ts'
import { validate } from '../middleware.ts'
import { sessionService as service, type ResolveError } from './service.ts'

/** Sessions of one of the therapist's patients. Mounted at /api/me/patients/:patientId/sessions. */
export const sessionsRouter = Router({ mergeParams: true })

type Params = { patientId: string; id: string }

const notFound = (res: Response) => res.status(404).json({ error: 'Non atopado' })

const MESSAGES: Record<ResolveError['status'], [number, string]> = {
  unavailable: [422, 'Algunha terapia xa non está dispoñible'],
  changed: [409, 'Algunha terapia cambiou: recarga e volve escoller os remedios'],
}

/** Sends the result, or the error that it stands for. */
function reply(res: Response, result: Awaited<ReturnType<typeof service.update>>, ok = 200) {
  if (!result) return void notFound(res)
  if ('status' in result) {
    const [code, error] = MESSAGES[result.status]
    return void res.status(code).json({ error })
  }
  res.status(ok).json(result)
}

sessionsRouter.get('/', async (req: Request<Params>, res) => {
  const list = await service.list(getAuth(res).userId, req.params.patientId)
  if (!list) return void notFound(res)
  res.json(list)
})

sessionsRouter.post('/', validate(createSessionSchema), async (req: Request<Params>, res) => {
  reply(res, await service.create(getAuth(res).userId, req.params.patientId, req.body), 201)
})

sessionsRouter.get('/:id', async (req: Request<Params>, res) => {
  const session = await service.get(getAuth(res).userId, req.params.patientId, req.params.id)
  if (!session) return void notFound(res)
  res.json(session)
})

sessionsRouter.patch('/:id', validate(sessionPatchSchema), async (req: Request<Params>, res) => {
  reply(res, await service.update(getAuth(res).userId, req.params.patientId, req.params.id, req.body))
})

sessionsRouter.delete('/:id', async (req: Request<Params>, res) => {
  if (!(await service.remove(getAuth(res).userId, req.params.patientId, req.params.id))) return void notFound(res)
  res.status(204).end()
})
