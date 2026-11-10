import { useEffect, useRef } from 'react'
import type { Crumb } from '../lib/tree.ts'

type Props = { crumbs: Crumb[]; onSelect: (path: number[]) => void }

/** Therapy name > category > subcategory. The last one is where we are; the others jump to that level. */
export default function Breadcrumb({ crumbs, onSelect }: Props) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (el) el.scrollLeft = el.scrollWidth // keep the current level in view when the trail is long
  }, [crumbs])

  return (
    <nav className="breadcrumb" aria-label="Camiño" ref={ref}>
      {crumbs.map((crumb, i) => {
        const last = i === crumbs.length - 1
        return (
          <span key={`${i}:${crumb.path.join('.')}`} className="crumb-wrap">
            {i > 0 && (
              <span className="crumb-sep" aria-hidden="true">
                ›
              </span>
            )}
            {last ? (
              <span className="crumb current" aria-current="page">
                {crumb.name}
              </span>
            ) : (
              <button type="button" className="crumb" onClick={() => onSelect(crumb.path)}>
                {crumb.name}
              </button>
            )}
          </span>
        )
      })}
    </nav>
  )
}
