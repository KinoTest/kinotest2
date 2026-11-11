import type { ContentDocument } from '@kinotest/shared'
import { apiJson } from './http.ts'

/** One row of GET /api/me/therapies: assigned to me and not expired. No document, no note or amount. */
export type TherapySummary = {
  id: string
  contentId: string
  lang: string
  title: string
  formatVersion: number
  expiresAt: string | null
}

/** GET /api/me/therapies/:id */
export type TherapyDetail = {
  id: string
  contentId: string
  lang: string
  title: string
  formatVersion: number
  data: ContentDocument
  updatedAt: string
}

export async function listTherapies(): Promise<TherapySummary[]> {
  const items = await apiJson<TherapySummary[]>('/api/me/therapies')
  return [...items].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || a.lang.localeCompare(b.lang))
}

export const getTherapy = (id: string): Promise<TherapyDetail> =>
  apiJson<TherapyDetail>(`/api/me/therapies/${encodeURIComponent(id)}`)
