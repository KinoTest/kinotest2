import { z } from 'zod'
import type { Remedy } from './schemas.ts'

/** Upper bounds of one therapy session. */
export const MAX_SESSION_NOTES = 50_000
export const MAX_SESSION_REMEDIES = 300

/** A calendar day, "YYYY-MM-DD" (the therapist's local date, no time zone). */
export const sessionDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`)
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s)
  }, { message: 'Data non válida' })

/**
 * A remedy chosen in a session, as the app sends it: where it is in a therapy assigned to the therapist and its
 * name (to detect that the therapy changed since the app loaded it). The API stores a copy (SessionRemedy).
 */
export const remedyRefSchema = z.object({
  contentItemId: z.string().min(1).max(64),
  path: z.array(z.number().int().min(0).max(9999)).min(1).max(50),
  name: z.string().max(200),
})
export type RemedyRef = z.infer<typeof remedyRefSchema>

const notesSchema = z.string().max(MAX_SESSION_NOTES)
const remediesSchema = z.array(remedyRefSchema).max(MAX_SESSION_REMEDIES)

export const createSessionSchema = z.object({
  date: sessionDateSchema,
  notes: notesSchema.default(''),
  remedies: remediesSchema.default([]),
})
export type CreateSession = z.infer<typeof createSessionSchema>

/** Leaving a field out keeps it. `remedies` replaces the whole selection. */
export const sessionPatchSchema = z
  .object({ date: sessionDateSchema.optional(), notes: notesSchema.optional(), remedies: remediesSchema.optional() })
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Nada que cambiar' })
export type SessionPatch = z.infer<typeof sessionPatchSchema>

/**
 * A remedy as stored in a session: a copy taken when it was chosen, so the session can still be read when the
 * therapy changes, expires or is unassigned. `trail` holds the names of the categories above it (the therapy
 * itself not included); `path` and `contentItemId` say where it was taken from.
 */
export type SessionRemedy = {
  contentItemId: string
  therapyTitle: string
  path: number[]
  trail: string[]
  remedy: Remedy
}

/** The first words of some Markdown, as plain text on one line (for lists). */
export function notesPreview(markdown: string, max = 160): string {
  const text = markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links and images: keep the text
    .replace(/^\s{0,3}(?:#{1,6}|>|[*+-]|\d+\.)\s+/gm, '') // block markers at the start of a line
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length <= max ? text : `${text.slice(0, max).trimEnd()}…`
}
