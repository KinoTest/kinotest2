import type { RemedyRef, SessionRemedy } from '@kinotest/shared'
import { apiJson } from './http.ts'

/** One row of GET /api/me/patients/:id/sessions (newest first). `date` is "YYYY-MM-DD". */
export type SessionSummary = { id: string; date: string; notesPreview: string; createdAt: string }

export type SessionDetail = {
  id: string
  date: string
  notes: string
  remedies: SessionRemedy[]
  createdAt: string
  updatedAt: string
}

const base = (patientId: string) => `/api/me/patients/${encodeURIComponent(patientId)}/sessions`
const one = (patientId: string, id: string) => `${base(patientId)}/${encodeURIComponent(id)}`

export const listSessions = (patientId: string): Promise<SessionSummary[]> => apiJson<SessionSummary[]>(base(patientId))

export const getSession = (patientId: string, id: string): Promise<SessionDetail> =>
  apiJson<SessionDetail>(one(patientId, id))

export const createSession = (
  patientId: string,
  body: { date: string; notes: string; remedies: RemedyRef[] },
): Promise<SessionDetail> => apiJson<SessionDetail>(base(patientId), { method: 'POST', body })

export const updateSession = (
  patientId: string,
  id: string,
  patch: { notes?: string; remedies?: RemedyRef[] },
): Promise<SessionDetail> => apiJson<SessionDetail>(one(patientId, id), { method: 'PATCH', body: patch })

export const deleteSession = (patientId: string, id: string): Promise<void> =>
  apiJson<void>(one(patientId, id), { method: 'DELETE' })
