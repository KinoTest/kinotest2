import { apply, getNode, invert, type Cmd, type EditorDoc } from './tree.ts'

// Editor state with a single undo history (`therapy`): only the structure of the tree (insert, move, remove, rename).
// Edits made in form fields and in the Markdown editor use NO_HISTORY: the browser or the editor undoes those.
// Commands address nodes by id, so a command whose nodes are gone is skipped when undoing.

export interface Entry {
  cmd: Cmd
  time: number
}
export interface Stack {
  past: Entry[]
  future: Entry[]
}
export interface EditorState {
  doc: EditorDoc
  selectedId: string | null
  stacks: Record<string, Stack>
  /** Grows with every change (also undo and redo); compared with the saved one to know if there is anything to save. */
  revision: number
}

export const THERAPY = 'therapy'

/** Scope for edits that must not enter the undo history (form fields, Markdown editor). */
export const NO_HISTORY = 'none'

export type Action =
  | { type: 'exec'; scope: string; cmd: Cmd; time: number }
  | { type: 'undo'; scope: string }
  | { type: 'redo'; scope: string }
  | { type: 'select'; id: string | null }

export const initState = (doc: EditorDoc): EditorState => ({ doc, selectedId: null, stacks: {}, revision: 0 })

const emptyStack: Stack = { past: [], future: [] }
const stackOf = (s: EditorState, scope: string): Stack => s.stacks[scope] ?? emptyStack

export const canUndo = (s: EditorState, scope: string): boolean => stackOf(s, scope).past.length > 0
export const canRedo = (s: EditorState, scope: string): boolean => stackOf(s, scope).future.length > 0

function nextSelection(selectedId: string | null, doc: EditorDoc, cmd: Cmd): string | null {
  if (cmd.kind === 'insert') return cmd.node.id // a new (or restored) node gets selected
  return selectedId && !getNode(doc.root, selectedId) ? null : selectedId
}

function applied(s: EditorState, doc: EditorDoc, cmd: Cmd, scope: string, stack: Stack): EditorState {
  return {
    doc,
    selectedId: nextSelection(s.selectedId, doc, cmd),
    stacks: { ...s.stacks, [scope]: stack },
    revision: s.revision + 1,
  }
}

export function reducer(s: EditorState, a: Action): EditorState {
  switch (a.type) {
    case 'select':
      return s.selectedId === a.id ? s : { ...s, selectedId: a.id }

    case 'exec': {
      const doc = apply(s.doc, a.cmd)
      if (!doc) return s
      if (a.scope === NO_HISTORY) {
        return { ...s, doc, selectedId: nextSelection(s.selectedId, doc, a.cmd), revision: s.revision + 1 }
      }
      const { past } = stackOf(s, a.scope)
      const entry: Entry = { cmd: a.cmd, time: a.time }
      return applied(s, doc, a.cmd, a.scope, { past: [...past, entry], future: [] })
    }

    case 'undo': {
      const st = stackOf(s, a.scope)
      let past = st.past
      while (past.length > 0) {
        const entry = past[past.length - 1]
        past = past.slice(0, -1)
        if (!entry) break
        const inverse = invert(entry.cmd)
        const doc = apply(s.doc, inverse)
        if (doc) return applied(s, doc, inverse, a.scope, { past, future: [...st.future, entry] })
      }
      // Whatever was left cannot be applied any more (its nodes are gone): forget it.
      return past.length === st.past.length ? s : { ...s, stacks: { ...s.stacks, [a.scope]: { past, future: st.future } } }
    }

    case 'redo': {
      const st = stackOf(s, a.scope)
      let future = st.future
      while (future.length > 0) {
        const entry = future[future.length - 1]
        future = future.slice(0, -1)
        if (!entry) break
        const doc = apply(s.doc, entry.cmd)
        if (doc) return applied(s, doc, entry.cmd, a.scope, { past: [...st.past, entry], future })
      }
      return future.length === st.future.length ? s : { ...s, stacks: { ...s.stacks, [a.scope]: { past: st.past, future } } }
    }
  }
}
