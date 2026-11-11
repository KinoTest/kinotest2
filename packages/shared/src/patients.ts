import { z } from 'zod'

/** Upper bound of a patient's notes, in characters (the API takes bodies up to 512 KB on these routes). */
export const MAX_PATIENT_NOTES = 50_000

const nameSchema = z.string().trim().min(1, { message: 'Escribe un nome' }).max(200)
const notesSchema = z.string().max(MAX_PATIENT_NOTES)

/** A new patient only needs a name. */
export const createPatientSchema = z.object({ name: nameSchema })
export type CreatePatient = z.infer<typeof createPatientSchema>

/** Leaving a field out keeps it. `notes` is Markdown; '' clears it. */
export const patientPatchSchema = z
  .object({ name: nameSchema.optional(), notes: notesSchema.optional() })
  .refine((v) => v.name !== undefined || v.notes !== undefined, { message: 'Nada que cambiar' })
export type PatientPatch = z.infer<typeof patientPatchSchema>
