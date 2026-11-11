import { useIonViewDidLeave, useIonViewWillEnter } from '@ionic/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './session.ts'

export type LoadState<T> = { status: 'loading' } | { status: 'error'; notFound: boolean } | { status: 'ready'; value: T }

type Stored<T> = { key: string; state: LoadState<T> }

/**
 * Loads something from the API whenever `key` changes (an empty key waits: a page kept in the stack while
 * another route is shown can lose its params). A value loaded for another key is never returned.
 * Also returns `reload` (spinner, then load again; `silent` keeps what is shown and ignores a failure) and
 * `set` (with what the API answered to a change). `load` is read from the render that set `key`.
 */
export function useLoad<T>(
  key: string,
  load: () => Promise<T>,
): [LoadState<T>, (silent?: boolean) => void, (value: T) => void] {
  const [stored, setStored] = useState<Stored<T>>({ key, state: { status: 'loading' } })
  const [attempt, setAttempt] = useState({ n: 0, silent: false })

  useEffect(() => {
    if (!key) return
    let alive = true
    load().then(
      (value) => {
        if (alive) setStored({ key, state: { status: 'ready', value } })
      },
      (err: unknown) => {
        if (!alive) return
        const state: LoadState<T> = { status: 'error', notFound: err instanceof ApiError && err.status === 404 }
        setStored((prev) => (attempt.silent && prev.key === key && prev.state.status === 'ready' ? prev : { key, state }))
      },
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` identifies what `load` loads
  }, [key, attempt])

  const reload = useCallback(
    (silent = false) => {
      if (!silent) setStored({ key, state: { status: 'loading' } })
      setAttempt((a) => ({ n: a.n + 1, silent }))
    },
    [key],
  )

  const set = useCallback((value: T) => setStored({ key, state: { status: 'ready', value } }), [key])

  return [stored.key === key ? stored.state : { status: 'loading' }, reload, set]
}

/**
 * Runs `fn` each time the page comes back on screen after another page covered it. It watches the page leaving
 * instead of counting entries, so it also works in a component mounted after the page was first shown
 * (e.g. once the data above it has loaded).
 */
export function useOnReturn(fn: () => void): void {
  const left = useRef(false)
  const latest = useRef(fn)
  useEffect(() => {
    latest.current = fn
  })
  // Ionic keeps the first callbacks it is given: they read the latest `fn` through the ref.
  useIonViewDidLeave(() => {
    left.current = true
  })
  useIonViewWillEnter(() => {
    if (!left.current) return
    left.current = false
    latest.current()
  })
}
