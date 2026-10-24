import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { Markdown } from '@tiptap/markdown'
import StarterKit from '@tiptap/starter-kit'
import { applyFormat, type Format } from '../editor/markdown.ts'

const HEADING_LEVEL = 2

/** The serializer ends the text with blank lines: they are not part of the content. */
const markdownOf = (editor: Editor): string => editor.getMarkdown().trimEnd()

const BUTTONS: { kind: Format; label: ReactNode; title: string }[] = [
  { kind: 'bold', label: <b>N</b>, title: 'Negriña (Ctrl+B)' },
  { kind: 'italic', label: <i>C</i>, title: 'Cursiva (Ctrl+I)' },
  { kind: 'heading', label: 'T', title: 'Título' },
  { kind: 'bullet', label: '•', title: 'Lista' },
  { kind: 'numbered', label: '1.', title: 'Lista numerada' },
  { kind: 'quote', label: '“', title: 'Cita' },
  { kind: 'link', label: 'Ligazón', title: 'Ligazón' },
]

/** Name of the Tiptap node or mark that shows a toolbar button as pressed. */
const ACTIVE: Partial<Record<Format, string>> = {
  bold: 'bold',
  italic: 'italic',
  heading: 'heading',
  bullet: 'bulletList',
  numbered: 'orderedList',
  quote: 'blockquote',
  link: 'link',
}

function formatVisual(editor: Editor, kind: Format) {
  const chain = editor.chain().focus()
  switch (kind) {
    case 'bold':
      chain.toggleBold().run()
      break
    case 'italic':
      chain.toggleItalic().run()
      break
    case 'heading':
      chain.toggleHeading({ level: HEADING_LEVEL }).run()
      break
    case 'bullet':
      chain.toggleBulletList().run()
      break
    case 'numbered':
      chain.toggleOrderedList().run()
      break
    case 'quote':
      chain.toggleBlockquote().run()
      break
    case 'link': {
      const current = (editor.getAttributes('link').href as string | undefined) ?? ''
      const url = window.prompt('Enderezo da ligazón (baleiro para quitala)', current)
      if (url === null) return
      const href = url.trim()
      if (href === '') chain.extendMarkRange('link').unsetLink().run()
      else if (editor.state.selection.empty && !editor.isActive('link')) {
        // Nothing selected: the address itself becomes the text of the link.
        chain.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] }).run()
      } else chain.extendMarkRange('link').setLink({ href }).run()
      break
    }
  }
}

interface Props {
  value: string
  onChange: (value: string) => void
  rows?: number
}

/**
 * Basic Markdown (no HTML) edited visually with Tiptap; "Código" shows the Markdown source in a textarea.
 * Undo and redo are the editor's own (Tiptap) or the browser's (textarea): nothing goes into the editor history.
 * The text is only rewritten by the editor after the first edit, so opening a remedy never changes it.
 */
export default function MarkdownEditor({ value, onChange, rows = 12 }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [code, setCode] = useState(false)
  const latest = useRef(onChange)
  useEffect(() => {
    latest.current = onChange
  })
  /** Last text the visual editor itself emitted: a different `value` comes from outside (import, undo in the tree). */
  const emitted = useRef(value)

  const editor = useEditor({
    extensions: [StarterKit.configure({ underline: false, link: { openOnClick: false } }), Markdown],
    content: value,
    contentType: 'markdown',
    shouldRerenderOnTransaction: true,
    onUpdate: ({ editor }) => {
      emitted.current = markdownOf(editor)
      latest.current(emitted.current)
    },
  })

  // The visual editor is not a controlled component: follow the text when it changes from outside or in the source view.
  useEffect(() => {
    if (!editor || value === emitted.current) return
    emitted.current = value
    if (markdownOf(editor) !== value) editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
  }, [editor, value])

  const format = (kind: Format) => {
    if (!code) {
      if (editor) formatVisual(editor, kind)
      return
    }
    const el = ref.current
    if (!el) return
    const edit = applyFormat(el.value, el.selectionStart, el.selectionEnd, kind)
    onChange(edit.text)
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(edit.start, edit.end)
    })
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!(e.ctrlKey || e.metaKey)) return
    const key = e.key.toLowerCase()
    if (key === 'b') {
      e.preventDefault()
      format('bold')
    } else if (key === 'i') {
      e.preventDefault()
      format('italic')
    }
  }

  return (
    <div className="md-editor">
      <div className="md-toolbar" role="toolbar" aria-label="Formato do texto">
        {BUTTONS.map((b) => {
          const name = ACTIVE[b.kind]
          const active = !code && name !== undefined && !!editor?.isActive(name)
          return (
            <button
              key={b.kind}
              type="button"
              title={b.title}
              aria-label={b.title}
              aria-pressed={code ? undefined : active}
              className={active ? 'is-active' : undefined}
              disabled={!code && !editor}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => format(b.kind)}
            >
              {b.label}
            </button>
          )
        })}
        <button type="button" className="md-toggle" onClick={() => setCode((c) => !c)}>
          {code ? 'Visual' : 'Código'}
        </button>
      </div>
      {code ? (
        <textarea
          ref={ref}
          className="md-textarea"
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
        />
      ) : (
        <EditorContent editor={editor} className="md-visual" />
      )}
    </div>
  )
}
