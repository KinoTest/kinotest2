import type { AssignmentPatch, CreateAssignmentsInput, DeleteAssignments, Role } from '@kinotest/shared'
import { ApiError, authFetch } from './session.ts'

/** A therapist (a registered user), as `GET /api/users` returns it. */
export interface UserSummary {
  id: string
  email: string
  role: Role
  /** null = account created by the owner (invited) and not confirmed yet. */
  confirmedAt: string | null
  createdAt: string
  assignmentCount: number
}

/** One therapy (one language) assigned to one therapist. */
export interface AssignmentRow {
  id: string
  userId: string
  contentItemId: string
  assignedById: string
  expiresAt: string | null
  note: string | null
  /** Price charged to the therapist, in EUR (informational). */
  amount: number | null
  createdAt: string
  updatedAt: string
  user: { id: string; email: string }
  contentItem: { id: string; contentId: string; lang: string; title: string }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await authFetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, data?.error ?? 'Erro')
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const listUsers = (search = ''): Promise<UserSummary[]> =>
  request(`/api/users${search.trim() ? `?search=${encodeURIComponent(search.trim())}` : ''}`)

export const getUser = (id: string): Promise<UserSummary> => request(`/api/users/${encodeURIComponent(id)}`)

export function listAssignments(filter: { userId?: string; contentItemId?: string }): Promise<AssignmentRow[]> {
  const query = new URLSearchParams()
  if (filter.userId) query.set('userId', filter.userId)
  if (filter.contentItemId) query.set('contentItemId', filter.contentItemId)
  return request(`/api/assignments?${query}`)
}

export interface CreateAssignmentsResult {
  created: number
  skipped: number
  /** New accounts (from `emails`) that were created and invited. */
  invited: string[]
  /** New accounts whose invitation email failed (the assignment is kept; resend it). */
  inviteFailed: string[]
}

/** Every therapist (by id or email) x every therapy; pairs that already exist are skipped. */
export const createAssignments = (input: CreateAssignmentsInput): Promise<CreateAssignmentsResult> =>
  request('/api/assignments', { method: 'POST', body: JSON.stringify(input) })

/** Resends the invitation to the unconfirmed accounts among `userIds`. */
export const resendInvitations = (userIds: string[]): Promise<{ invited: string[]; failed: string[] }> =>
  request('/api/assignments/invitations', { method: 'POST', body: JSON.stringify({ userIds }) })

export const deleteAssignments = (input: DeleteAssignments): Promise<{ deleted: number }> =>
  request('/api/assignments', { method: 'DELETE', body: JSON.stringify(input) })

export const patchAssignment = (id: string, patch: AssignmentPatch): Promise<AssignmentRow> =>
  request(`/api/assignments/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
