import type { ContentDocument } from '@kinotest/shared'
import { describe, expect, it } from 'vitest'
import {
  canRedo,
  canUndo,
  initState,
  NO_HISTORY,
  reducer,
  THERAPY,
  type Action,
  type EditorState,
} from './state.ts'
import { cmdInsert, cmdMove, cmdRemove, cmdReplaceAll, cmdSetField, cmdSetMeta, fromDocument, getNode, newRemedy, ROOT_ID, toDocument, type Cmd } from './tree.ts'

const stored: ContentDocument = {
  id: 'p',
  lang: 'es-ES',
  formatVersion: 1,
  type: 'catalog',
  name: 'P',
  contents: [
    { type: 'catalog', name: 'Cat', contents: [{ type: 'remedy', name: 'A', description: '', images: [] }] },
    { type: 'remedy', name: 'B', description: '', images: [] },
  ],
}

const start = (): EditorState => initState(fromDocument(stored))
const idOf = (s: EditorState, name: string): string => {
  const find = (c: { children: { id: string; name: string; type: string; children?: unknown }[] }): string | undefined => {
    for (const n of c.children) {
      if (n.name === name) return n.id
      if (n.type === 'catalog') {
        const r = find(n as never)
        if (r) return r
      }
    }
  }
  const id = find(s.doc.root)
  if (!id) throw new Error(name)
  return id
}
const must = (c: Cmd | null): Cmd => {
  if (!c) throw new Error('no command')
  return c
}
const exec = (s: EditorState, scope: string, cmd: Cmd | null, time = 0): EditorState =>
  reducer(s, { type: 'exec', scope, cmd: must(cmd), time } satisfies Action)

describe('history', () => {
  it('undo and redo restore the document and the revision keeps growing', () => {
    let s = start()
    const original = toDocument(s.doc)
    s = exec(s, THERAPY, cmdRemove(s.doc, idOf(s, 'B')))
    const removed = toDocument(s.doc)
    s = reducer(s, { type: 'undo', scope: THERAPY })
    expect(toDocument(s.doc)).toEqual(original)
    s = reducer(s, { type: 'redo', scope: THERAPY })
    expect(toDocument(s.doc)).toEqual(removed)
    expect(s.revision).toBe(3)
  })

  it('a new action clears the redo stack', () => {
    let s = start()
    s = exec(s, THERAPY, cmdRemove(s.doc, idOf(s, 'B')))
    s = reducer(s, { type: 'undo', scope: THERAPY })
    expect(canRedo(s, THERAPY)).toBe(true)
    s = exec(s, THERAPY, cmdInsert(s.doc, ROOT_ID, newRemedy('Novo')))
    expect(canRedo(s, THERAPY)).toBe(false)
  })

  it('edits outside the history change the document but never enter the stacks', () => {
    let s = start()
    const a = idOf(s, 'A')
    s = exec(s, NO_HISTORY, cmdSetField(s.doc, a, 'description', 'hola'))
    s = exec(s, NO_HISTORY, cmdSetMeta(s.doc, 'slug', 'nova'))
    expect((getNode(s.doc.root, a) as { description: string }).description).toBe('hola')
    expect(s.doc.meta.slug).toBe('nova')
    expect(s.revision).toBe(2)
    expect(canUndo(s, THERAPY)).toBe(false)
    expect(canUndo(s, NO_HISTORY)).toBe(false)
  })

  it('undoing the structure keeps the text edited outside the history', () => {
    let s = start()
    const a = idOf(s, 'A')
    s = exec(s, NO_HISTORY, cmdSetField(s.doc, a, 'description', 'texto'))
    s = exec(s, THERAPY, cmdMove(s.doc, idOf(s, 'B'), idOf(s, 'Cat'), 0))
    s = reducer(s, { type: 'undo', scope: THERAPY })
    expect((getNode(s.doc.root, a) as { description: string }).description).toBe('texto')
    expect(canUndo(s, THERAPY)).toBe(false)
  })

  it('skips history entries whose node is gone instead of failing', () => {
    let s = start()
    const a = idOf(s, 'A')
    s = exec(s, THERAPY, cmdSetField(s.doc, a, 'name', 'A2'))
    s = exec(s, NO_HISTORY, cmdRemove(s.doc, a)) // the node disappears without a history entry
    const before = s.doc
    s = reducer(s, { type: 'undo', scope: THERAPY })
    expect(s.doc).toBe(before)
    expect(canUndo(s, THERAPY)).toBe(false)
  })
})

describe('replacing everything', () => {
  it('clears a selection that no longer exists, and undo brings the old therapy back', () => {
    let s = start()
    const original = toDocument(s.doc)
    s = reducer(s, { type: 'select', id: idOf(s, 'B') })
    s = exec(s, THERAPY, cmdReplaceAll(s.doc, fromDocument({ ...stored, name: 'Nova', contents: [] })))
    expect(s.doc.root.children).toHaveLength(0)
    expect(s.selectedId).toBeNull()
    s = reducer(s, { type: 'undo', scope: THERAPY })
    expect(toDocument(s.doc)).toEqual(original)
  })
})

describe('selection', () => {
  it('a new node gets selected, removing the selected one clears it', () => {
    let s = start()
    const node = newRemedy('Novo')
    s = exec(s, THERAPY, cmdInsert(s.doc, ROOT_ID, node))
    expect(s.selectedId).toBe(node.id)
    s = reducer(s, { type: 'undo', scope: THERAPY })
    expect(s.selectedId).toBeNull()
    s = reducer(s, { type: 'redo', scope: THERAPY })
    expect(s.selectedId).toBe(node.id)
  })

  it('selecting the same id returns the same state', () => {
    const s = reducer(start(), { type: 'select', id: 'x' })
    expect(reducer(s, { type: 'select', id: 'x' })).toBe(s)
  })
})
