import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../lib/session.ts'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const session = useSession()
  return session ? <>{children}</> : <Navigate to="/login" replace />
}
