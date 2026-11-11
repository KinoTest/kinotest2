import { MAX_PATIENT_NOTES } from '@kinotest/shared'
import { apiJson } from './http.ts'
import { sortPatients } from './patientList.ts'

export { MAX_PATIENT_NOTES }

/** One row of GET /api/me/patients (no notes). */
export type PatientSummary = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

/** GET /api/me/patients/:id. `notes` is Markdown, '' when there are none. */
export type PatientDetail = PatientSummary & { notes: string }

const base = '/api/me/patients'
const one = (id: string) => `${base}/${encodeURIComponent(id)}`

export const listPatients = async (): Promise<PatientSummary[]> => sortPatients(await apiJson<PatientSummary[]>(base))

export const getPatient = (id: string): Promise<PatientDetail> => apiJson<PatientDetail>(one(id))

export const createPatient = (name: string): Promise<PatientDetail> =>
  apiJson<PatientDetail>(base, { method: 'POST', body: { name } })

export const updatePatient = (id: string, patch: { name?: string; notes?: string }): Promise<PatientDetail> =>
  apiJson<PatientDetail>(one(id), { method: 'PATCH', body: patch })

export const deletePatient = (id: string): Promise<void> => apiJson<void>(one(id), { method: 'DELETE' })
