import { useEffect, useRef, useState } from 'react'

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const media = window.matchMedia(query)
    const onChange = () => setMatches(media.matches)
    media.addEventListener('change', onChange)
    onChange()
    return () => media.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** Height in pixels of an element, kept up to date (the tree needs a fixed height). */
export function useElementHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [height, setHeight] = useState(300)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setHeight(el.clientHeight)
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setHeight(Math.floor(entry.contentRect.height))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return [ref, height] as const
}
