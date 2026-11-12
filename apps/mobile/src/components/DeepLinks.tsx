import { App as CapApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

// Paths an App Link may open inside the app (must match the intent-filter in AndroidManifest.xml).
const HANDLED = new Set(['/auth/verify'])

/** On Android, routes App Links (the login email link) into the app instead of the browser. */
export default function DeepLinks() {
  const navigate = useNavigate()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const open = (raw: string | undefined) => {
      if (!raw) return
      try {
        const url = new URL(raw)
        if (HANDLED.has(url.pathname)) navigate(url.pathname + url.search, { replace: true })
      } catch {
        // not a URL we understand: ignore
      }
    }

    // Cold start: the link launched the app. Warm start: the app was already running.
    void CapApp.getLaunchUrl().then((r) => open(r?.url))
    const sub = CapApp.addListener('appUrlOpen', (e) => open(e.url))
    return () => {
      void sub.then((s) => s.remove())
    }
  }, [navigate])

  return null
}
