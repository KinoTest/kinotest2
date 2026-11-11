import type { KeyboardEvent, MouseEvent } from 'react'
import Markdown from 'react-markdown'

type Props = {
  text: string
  /** Makes the text tappable (e.g. to edit it). A tap on a link inside still opens the link. */
  onTap?: () => void
  /** What a tap does, for screen readers (with `onTap`). */
  tapLabel?: string
}

/** Renders stored Markdown. react-markdown does not render raw HTML, so the text is safe to show. */
export default function MarkdownView({ text, onTap, tapLabel }: Props) {
  if (!text.trim()) return null

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!(e.target instanceof Element && e.target.closest('a'))) onTap?.()
  }
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      onTap?.()
    }
  }
  const tappable = onTap ? { role: 'button', tabIndex: 0, 'aria-label': tapLabel, onClick, onKeyDown } : {}

  return (
    <div className={onTap ? 'markdown tappable' : 'markdown'} {...tappable}>
      <Markdown
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  )
}
