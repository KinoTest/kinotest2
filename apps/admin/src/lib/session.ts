import type { Session } from '@kinotest/shared'
import { useSyncExternalStore } from 'react'
import { API_URL } from './api.ts'

const KEY = 'kinotest.session'

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// Token storage. localStorage is fine for the web panel; in the native app
// replace this object with secure storage (Capacitor), never localStorage.
const storage = {
  load(): Session | null {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? (JSON.parse(raw) as Session) : null
    } catch {
      return null
    }
  },
  save(value: Session | null): void {
    try {
      if (value) localStorage.setItem(KEY, JSON.stringify(value))
      else localStorage.removeItem(KEY)
    } catch {
      // storage unavailable: the session lives only in memory
    }
  },
}

let session: Session | null = storage.load()
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

function setSession(next: Session | null): void {
  session = next
  storage.save(next)
  emit()
}

// Keep several tabs in sync (refresh tokens rotate: a stale tab would trigger reuse detection).
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    session = storage.load()
    emit()
  }
})

export const useSession = (): Session | null =>
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => session,
  )

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null
    throw new ApiError(res.status, data?.error ?? 'Erro')
  }
  return (res.status === 204 ? undefined : await res.json()) as T
}

export const requestLink = (email: string): Promise<unknown> => post('request-link', { email })

export async function verifyLink(token: string): Promise<void> {
  setSession(await post<Session>('verify', { token }))
}

export async function logout(): Promise<void> {
  const current = session
  setSession(null)
  if (current) await post('logout', { refreshToken: current.refreshToken }).catch(() => {})
}

// --- Refresh: one request at a time per tab, and one per browser (Web Locks) ---
let refreshing: Promise<Session | null> | null = null

const withLock = <T>(fn: () => Promise<T>): Promise<T> =>
  'locks' in navigator ? navigator.locks.request('kinotest-refresh', fn) : fn()

function refreshSession(usedAccessToken: string): Promise<Session | null> {
  refreshing ??= withLock(async () => {
    // Another tab may have refreshed while we waited for the lock.
    const latest = storage.load()
    if (!latest) return null
    if (latest.accessToken !== usedAccessToken) {
      session = latest
      emit()
      return latest
    }
    try {
      const next = await post<Session>('refresh', { refreshToken: latest.refreshToken })
      setSession(next)
      return next
    } catch (err) {
      // 401 = refresh token invalid: end the session. Network errors keep it.
      if (err instanceof ApiError && err.status === 401) setSession(null)
      return null
    }
  }).finally(() => {
    refreshing = null
  })
  return refreshing
}

/** fetch with the access token; on 401 refreshes once and retries. `path` starts with "/". */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const send = (s: Session) => {
    const headers = new Headers(init.headers)
    headers.set('Authorization', `Bearer ${s.accessToken}`)
    return fetch(`${API_URL}${path}`, { ...init, headers })
  }
  if (!session) throw new ApiError(401, 'Non autenticado')
  const used = session.accessToken
  const res = await send(session)
  if (res.status !== 401) return res
  const next = await refreshSession(used)
  if (!next) throw new ApiError(401, 'Sesión caducada')
  return send(next)
}
