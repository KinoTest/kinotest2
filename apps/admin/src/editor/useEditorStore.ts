import { useCallback, useReducer } from 'react'
import { initState, reducer } from './state.ts'
import type { Cmd, EditorDoc } from './tree.ts'

export function useEditorStore(initial: EditorDoc) {
  const [state, dispatch] = useReducer(reducer, initial, initState)
  /** A null command (nothing changed, or it does not fit) is ignored. */
  const exec = useCallback((scope: string, cmd: Cmd | null) => {
    if (cmd) dispatch({ type: 'exec', scope, cmd, time: Date.now() })
  }, [])
  const undo = useCallback((scope: string) => dispatch({ type: 'undo', scope }), [])
  const redo = useCallback((scope: string) => dispatch({ type: 'redo', scope }), [])
  const select = useCallback((id: string | null) => dispatch({ type: 'select', id }), [])
  return { state, exec, undo, redo, select }
}
export type EditorStore = ReturnType<typeof useEditorStore>
