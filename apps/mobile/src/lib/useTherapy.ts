import { useCallback, useEffect, useState } from 'react'
import { getTherapy, type TherapyDetail } from './therapies.ts'
import { ApiError } from './session.ts'

export type TherapyState =
  | { status: 'loading' }
  | { status: 'error'; notFound: boolean }
  | { status: 'ready'; therapy: TherapyDetail }

/** Loads one therapy. The second value reloads it (after an error). */
export function useTherapy(id: string): [TherapyState, () => void] {
  const [state, setState] = useState<TherapyState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!id) return // a page kept in the stack while another route is shown can lose its params
    let alive = true
    getTherapy(id).then(
      (therapy) => {
        if (alive) setState({ status: 'ready', therapy })
      },
      (err: unknown) => {
        if (alive) setState({ status: 'error', notFound: err instanceof ApiError && err.status === 404 })
      },
    )
    return () => {
      alive = false
    }
  }, [id, attempt])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((n) => n + 1)
  }, [])

  return [state, reload]
}
