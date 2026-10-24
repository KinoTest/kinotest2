/** Elements with their own undo (form fields, contenteditable): the browser or the Markdown editor handles Ctrl+Z there. */
const hasOwnUndo = (target: EventTarget | null | undefined): boolean =>
  target instanceof Element && target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])') !== null

/** Ctrl/Cmd+Z undoes, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+Y redo the tree history, except inside elements with their own undo. */
export function historyKey(
  e: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; target?: EventTarget | null; preventDefault: () => void },
  undo: () => void,
  redo: () => void,
): void {
  if (!(e.ctrlKey || e.metaKey) || hasOwnUndo(e.target)) return
  const key = e.key.toLowerCase()
  if (key === 'z') {
    e.preventDefault()
    if (e.shiftKey) redo()
    else undo()
  } else if (key === 'y') {
    e.preventDefault()
    redo()
  }
}
