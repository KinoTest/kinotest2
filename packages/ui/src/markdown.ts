// Formatting for the Markdown editor's toolbar. Pure functions over (text, selection) so they can be tested.

export type Format = 'bold' | 'italic' | 'heading' | 'bullet' | 'numbered' | 'quote' | 'link'

export interface Edit {
  text: string
  start: number
  end: number
}

const PLACEHOLDER = 'texto'

function wrap(text: string, start: number, end: number, mark: string): Edit {
  const before = text.slice(0, start)
  const selected = text.slice(start, end)
  const after = text.slice(end)
  // Marks around the selection: remove them.
  if (before.endsWith(mark) && after.startsWith(mark)) {
    return {
      text: before.slice(0, -mark.length) + selected + after.slice(mark.length),
      start: start - mark.length,
      end: end - mark.length,
    }
  }
  // Marks inside the selection: remove them.
  if (selected.length >= mark.length * 2 && selected.startsWith(mark) && selected.endsWith(mark)) {
    const inner = selected.slice(mark.length, -mark.length)
    return { text: before + inner + after, start, end: start + inner.length }
  }
  const body = selected || PLACEHOLDER
  return {
    text: before + mark + body + mark + after,
    start: start + mark.length,
    end: start + mark.length + body.length,
  }
}

type LineFormat = 'heading' | 'bullet' | 'numbered' | 'quote'

// What each format puts at the start of a line, and what it replaces when it is applied to a line that
// already starts with something else of the same family (a bullet list becomes a numbered one, not "1. * a").
const OWN: Record<LineFormat, RegExp> = {
  heading: /^#{1,6}\s+/,
  bullet: /^[*+-]\s+/,
  numbered: /^\d+\.\s+/,
  quote: /^>\s?/,
}
const REPLACES: Record<LineFormat, RegExp> = { ...OWN, bullet: /^(?:[*+-]|\d+\.)\s+/, numbered: /^(?:[*+-]|\d+\.)\s+/ }

function prefixLines(text: string, start: number, end: number, kind: LineFormat): Edit {
  const lineStart = text.lastIndexOf('\n', start - 1) + 1
  const lastChar = end > start && text[end - 1] === '\n' ? end - 1 : end
  const nl = text.indexOf('\n', lastChar)
  const lineEnd = nl === -1 ? text.length : nl
  const lines = text.slice(lineStart, lineEnd).split('\n')

  // If every non-blank line already has this format, the click removes it; otherwise it adds it.
  const content = lines.filter((l) => l.trim() !== '')
  const allHave = content.length > 0 && content.every((l) => OWN[kind].test(l))

  let n = 0
  const out = lines.map((line) => {
    if (allHave) return line.replace(OWN[kind], '')
    if (line.trim() === '' && lines.length > 1) return line
    n += 1
    const prefix = kind === 'heading' ? '## ' : kind === 'bullet' ? '* ' : kind === 'numbered' ? `${n}. ` : '> '
    return prefix + line.replace(REPLACES[kind], '')
  })
  const block = out.join('\n')
  return { text: text.slice(0, lineStart) + block + text.slice(lineEnd), start: lineStart, end: lineStart + block.length }
}

function link(text: string, start: number, end: number): Edit {
  const label = text.slice(start, end) || PLACEHOLDER
  const url = 'https://'
  const out = `[${label}](${url})`
  const urlStart = start + label.length + 3
  return { text: text.slice(0, start) + out + text.slice(end), start: urlStart, end: urlStart + url.length }
}

export function applyFormat(text: string, start: number, end: number, kind: Format): Edit {
  switch (kind) {
    case 'bold':
      return wrap(text, start, end, '**')
    case 'italic':
      return wrap(text, start, end, '_')
    case 'link':
      return link(text, start, end)
    default:
      return prefixLines(text, start, end, kind)
  }
}
