import type { ContentDocument } from '@kinotest/shared'
import { ApiError, authFetch } from './session.ts'

/** What the listing returns: the document without its `data`. */
export interface ContentSummary {
  id: string
  slug: string
  lang: string
  title: string
  formatVersion: number
  authorId: string
  createdAt: string
  updatedAt: string
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(`/api/content${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, data?.error ?? 'Erro')
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const listContent = (): Promise<ContentSummary[]> => request('')

export const createContent = (doc: ContentDocument): Promise<ContentSummary> =>
  request('', { method: 'POST', body: JSON.stringify(doc) })

/** Replaces the whole document. */
export const replaceContent = (id: string, doc: ContentDocument): Promise<ContentSummary> =>
  request(`/${id}`, { method: 'PUT', body: JSON.stringify(doc) })

export const deleteContent = (id: string): Promise<void> => request(`/${id}`, { method: 'DELETE' })
