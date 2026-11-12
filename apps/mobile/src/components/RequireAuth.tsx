import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSession } from '../lib/session.ts'

// Pages outside this guard. Ionic keeps earlier pages mounted (hidden), so this guard keeps rendering after the
// app has moved on to one of them: redirecting from there would bounce every visit back to /login.
const PUBLIC = new Set(['/login', '/auth/verify'])

export default function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  const { pathname } = useLocation()
  if (session) return <>{children}</>
  return PUBLIC.has(pathname) ? null : <Navigate to="/login" replace />
}
