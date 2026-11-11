import { ApiError, authFetch } from './session.ts'

/** Authenticated JSON request. `body` is sent as JSON; a non-2xx answer throws ApiError; 204 resolves to undefined. */
export async function apiJson<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const { method, body } = init
  const res = await authFetch(
    path,
    body === undefined
      ? { method }
      : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, data?.error ?? 'Erro')
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}
