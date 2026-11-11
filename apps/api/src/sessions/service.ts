import {
  crumbsOf,
  getNode,
  isCatalog,
  notesPreview,
  type Catalog,
  type CreateSession,
  type RemedyRef,
  type SessionPatch,
  type SessionRemedy,
} from '@kinotest/shared'
import { assignmentRepository } from '../assignments/repository.ts'
import { sessionRepository as repo } from './repository.ts'

type Row = NonNullable<Awaited<ReturnType<typeof repo.get>>>

/** 'YYYY-MM-DD' <-> the DATE column (Prisma reads and writes it as UTC midnight). */
const toDate = (day: string) => new Date(`${day}T00:00:00Z`)
const toDay = (date: Date) => date.toISOString().slice(0, 10)

const toDto = (row: Row) => ({ ...row, date: toDay(row.date), remedies: row.remedies as SessionRemedy[] })

const keyOf = (r: { contentItemId: string; path: number[] }) => `${r.contentItemId}|${r.path.join('.')}`

/** Why a selection cannot be saved: a therapy no longer readable (422), or changed since the app loaded it (409). */
export type ResolveError = { status: 'unavailable' | 'changed' }

/**
 * Turns the remedies the app sent into the copies stored in the session. A remedy the session already had
 * (same place, same name) keeps its stored copy, so editing a session never needs the therapy to still be
 * assigned. New ones are copied from a therapy assigned to the therapist and not expired.
 */
async function resolveRemedies(
  therapistId: string,
  refs: RemedyRef[],
  existing: SessionRemedy[] = [],
): Promise<SessionRemedy[] | ResolveError> {
  const kept = new Map(existing.map((r) => [keyOf(r), r]))
  const docs = new Map<string, { title: string; data: Catalog } | null>()
  const seen = new Set<string>()
  const out: SessionRemedy[] = []
  const now = new Date()

  for (const ref of refs) {
    const key = keyOf(ref)
    if (seen.has(key)) continue
    seen.add(key)

    const old = kept.get(key)
    if (old && old.remedy.name === ref.name) {
      out.push(old)
      continue
    }

    if (!docs.has(ref.contentItemId)) {
      const row = await assignmentRepository.getActive(therapistId, ref.contentItemId, now)
      docs.set(ref.contentItemId, row ? { title: row.contentItem.title, data: row.contentItem.data as Catalog } : null)
    }
    const doc = docs.get(ref.contentItemId)
    if (!doc) return { status: 'unavailable' }

    const node = getNode(doc.data, ref.path)
    const crumbs = crumbsOf(doc.data, ref.path)
    if (!node || isCatalog(node) || node.name !== ref.name || !crumbs) return { status: 'changed' }
    out.push({
      contentItemId: ref.contentItemId,
      therapyTitle: doc.title,
      path: ref.path,
      trail: crumbs.slice(1).map((c) => c.name),
      remedy: { type: 'remedy', name: node.name, description: node.description, images: node.images },
    })
  }
  return out
}

const isError = (v: unknown): v is ResolveError => !Array.isArray(v)

export const sessionService = {
  /** Null if the patient is not the therapist's. Notes come only as a short preview. */
  async list(therapistId: string, patientId: string) {
    if (!(await repo.patientExists(therapistId, patientId))) return null
    const rows = await repo.list(patientId)
    return rows.map(({ notes, date, ...r }) => ({ ...r, date: toDay(date), notesPreview: notesPreview(notes) }))
  },

  async get(therapistId: string, patientId: string, id: string) {
    const row = await repo.get(therapistId, patientId, id)
    return row && toDto(row)
  },

  async create(therapistId: string, patientId: string, input: CreateSession) {
    if (!(await repo.patientExists(therapistId, patientId))) return null
    const remedies = await resolveRemedies(therapistId, input.remedies)
    if (isError(remedies)) return remedies
    return toDto(await repo.create(patientId, { date: toDate(input.date), notes: input.notes, remedies }))
  },

  async update(therapistId: string, patientId: string, id: string, patch: SessionPatch) {
    const current = await repo.get(therapistId, patientId, id)
    if (!current) return null
    const data: { date?: Date; notes?: string; remedies?: SessionRemedy[] } = {}
    if (patch.date !== undefined) data.date = toDate(patch.date)
    if (patch.notes !== undefined) data.notes = patch.notes
    if (patch.remedies !== undefined) {
      const remedies = await resolveRemedies(therapistId, patch.remedies, current.remedies as SessionRemedy[])
      if (isError(remedies)) return remedies
      data.remedies = remedies
    }
    return toDto(await repo.update(id, data))
  },

  remove: (therapistId: string, patientId: string, id: string) => repo.remove(therapistId, patientId, id),
}
