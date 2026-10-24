// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import RemedyPanel from './RemedyPanel.tsx'
import TherapyPanel from './TherapyPanel.tsx'
import { fromDocument } from '../editor/tree.ts'
import { useEditorStore } from '../editor/useEditorStore.ts'

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 500 })
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never
  Element.prototype.scrollTo = () => {}
  // ProseMirror (Tiptap) measures text ranges, which jsdom does not implement.
  const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) }
  Range.prototype.getBoundingClientRect ??= () => rect as DOMRect
  Range.prototype.getClientRects ??= () =>
    ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
})
afterEach(cleanup)

// The Terapia panel (notes) has a Markdown editor too: the Remedio one is looked up inside its own panel.
const remedyPanel = () => within(screen.getByLabelText('Remedio'))

const doc = fromDocument({
  id: 'p', lang: 'es-ES', formatVersion: 1, type: 'catalog', name: 'Par',
  contents: [
    { type: 'catalog', name: 'Regular', contents: [{ type: 'remedy', name: 'Lunar', description: 'texto **x**', images: ['a/b.webp'] }] },
    { type: 'remedy', name: 'Suelto', description: '', images: [] },
  ],
})

function App() {
  const store = useEditorStore(doc)
  return (<><TherapyPanel store={store} /><RemedyPanel store={store} /><output data-testid="rev">{store.state.revision}</output></>)
}

describe('editor panels', () => {
  it('renders the tree, selects, adds, undoes', async () => {
    render(<App />)
    expect(screen.getByText('Selecciona un contedor ou un remedio no panel Terapia.')).toBeTruthy()
    expect(screen.getByText('Regular')).toBeTruthy()
    expect(screen.getByText('Suelto')).toBeTruthy()

    // select a remedy -> Remedio panel shows its editor
    await act(async () => { fireEvent.click(screen.getByText('Suelto')) })
    expect(screen.getByDisplayValue('Suelto')).toBeTruthy()

    // select a container -> invitation to create a remedy
    await act(async () => { fireEvent.click(screen.getByText('Regular')) })
    expect(screen.getByText('Crear un remedio novo aquí')).toBeTruthy()
    await act(async () => { fireEvent.click(screen.getByText('Crear un remedio novo aquí')) })
    expect(screen.getByDisplayValue('Novo remedio')).toBeTruthy()   // new remedy selected and editable
    expect(screen.getByTestId('rev').textContent).toBe('1')

    // the Markdown editor opens in visual mode; "Código" shows the source.
    // Typing there changes the revision but is not part of the history
    await act(async () => { fireEvent.click(remedyPanel().getByText('Código')) })
    const area = document.querySelector('textarea.md-textarea') as HTMLTextAreaElement
    await act(async () => { fireEvent.change(area, { target: { value: 'ola' } }) })
    expect((document.querySelector('textarea.md-textarea') as HTMLTextAreaElement).value).toBe('ola')
    expect(screen.getByTestId('rev').textContent).toBe('2')

    // the only undo is the tree one: it removes the new remedy -> back to the invitation
    await act(async () => { fireEvent.click(screen.getByTitle('Desfacer (Ctrl+Z)')) })
    expect(screen.queryByDisplayValue('Novo remedio')).toBeNull()
  })

  it('bold button wraps the selection', async () => {
    render(<App />)
    await act(async () => { fireEvent.click(screen.getByText('Suelto')) })
    await act(async () => { fireEvent.click(remedyPanel().getByText('Código')) })
    const area = document.querySelector('textarea.md-textarea') as HTMLTextAreaElement
    await act(async () => { fireEvent.change(area, { target: { value: 'hola mundo' } }) })
    const el = document.querySelector('textarea.md-textarea') as HTMLTextAreaElement
    el.setSelectionRange(0, 4)
    await act(async () => { fireEvent.click(remedyPanel().getByTitle('Negriña (Ctrl+B)')) })
    expect((document.querySelector('textarea.md-textarea') as HTMLTextAreaElement).value).toBe('**hola** mundo')
  })
})
