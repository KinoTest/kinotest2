import type { ContentItemInput, ContentItemUpdate } from '@kinotest/shared'
import { ApiError, authFetch } from './session.ts'

export interface ContentItem {
  id: string
  title: string
  description: string
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

export const listContent = (): Promise<ContentItem[]> => request('')

export const createContent = (input: ContentItemInput): Promise<ContentItem> =>
  request('', { method: 'POST', body: JSON.stringify(input) })

export const updateContent = (id: string, input: ContentItemUpdate): Promise<ContentItem> =>
  request(`/${id}`, { method: 'PATCH', body: JSON.stringify(input) })

export const deleteContent = (id: string): Promise<void> => request(`/${id}`, { method: 'DELETE' })
