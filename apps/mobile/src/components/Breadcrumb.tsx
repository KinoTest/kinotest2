import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { scrollEdges, type Edges } from '../lib/scrollEdges.ts'
import type { Crumb } from '../lib/tree.ts'

type Props = { crumbs: Crumb[]; onSelect: (path: number[]) => void }

const LIST_LABEL = 'Tus terapias'

/**
 * Tus terapias > therapy name > category > subcategory. The last one is where we are; the others jump to that level
 * (the first one goes back to the list of therapies).
 * When it does not fit it scrolls sideways (a finger drags it; a mouse drags it too), and the side that
 * still has hidden crumbs fades out.
 */
export default function Breadcrumb({ crumbs, onSelect }: Props) {
  const navigate = useNavigate()
  const ref = useRef<HTMLElement>(null)
  const [edges, setEdges] = useState<Edges>({ left: false, right: false })
  const drag = useRef<{ startX: number; startLeft: number; moved: boolean } | null>(null)
  const dragged = useRef(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    const next = scrollEdges(el.scrollLeft, el.clientWidth, el.scrollWidth)
    setEdges((prev) => (prev.left === next.left && prev.right === next.right ? prev : next))
  }, [])

  // Keep the current level (the last crumb) in view when the trail changes.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.scrollLeft = el.scrollWidth
    update()
  }, [crumbs, update])

  // The box can change size (rotation, split screen).
  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [update])

  // Touch and pen already scroll natively; this makes a mouse drag work too (desktop, browser testing).
  const onPointerDown = (e: ReactPointerEvent<HTMLElement>) => {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse' || e.button !== 0) return
    drag.current = { startX: e.clientX, startLeft: el.scrollLeft, moved: false }
  }
  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    const d = drag.current
    const el = ref.current
    if (!d || !el) return
    if ((e.buttons & 1) === 0) {
      drag.current = null // the button was released outside of the box
      return
    }
    const dx = e.clientX - d.startX
    if (!d.moved) {
      if (Math.abs(dx) < 5) return // still a click
      d.moved = true
      el.setPointerCapture(e.pointerId)
    }
    el.scrollLeft = d.startLeft - dx
  }
  const onPointerEnd = () => {
    if (drag.current?.moved) {
      dragged.current = true
      setTimeout(() => {
        dragged.current = false
      }, 0) // swallow the click that ends a drag
    }
    drag.current = null
  }

  const classes = ['breadcrumb', edges.left && 'fade-left', edges.right && 'fade-right'].filter(Boolean).join(' ')

  return (
    <div className="breadcrumb-bar">
      <nav
        className={classes}
        aria-label="Camiño"
        ref={ref}
        onScroll={update}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          if (dragged.current) {
            e.preventDefault()
            e.stopPropagation()
          }
        }}
      >
        <span className="crumb-wrap">
          <button type="button" className="crumb" onClick={() => navigate('/home')}>
            {LIST_LABEL}
          </button>
        </span>
        {crumbs.map((crumb, i) => {
          const last = i === crumbs.length - 1
          return (
            <span key={`${i}:${crumb.path.join('.')}`} className="crumb-wrap">
              <span className="crumb-sep" aria-hidden="true">
                ›
              </span>
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
    </div>
  )
}
