import type { ContentDocument } from '@kinotest/shared'
import { ApiError, authFetch } from './session.ts'

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

async function getJson<T>(path: string): Promise<T> {
  const res = await authFetch(path)
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, body?.error ?? 'Erro')
  }
  return (await res.json()) as T
}

export async function listTherapies(): Promise<TherapySummary[]> {
  const items = await getJson<TherapySummary[]>('/api/me/therapies')
  return [...items].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }) || a.lang.localeCompare(b.lang))
}

export const getTherapy = (id: string): Promise<TherapyDetail> =>
  getJson<TherapyDetail>(`/api/me/therapies/${encodeURIComponent(id)}`)
