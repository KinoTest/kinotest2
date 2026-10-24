// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import MarkdownEditor from './MarkdownEditor.tsx'

beforeAll(() => {
  const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0, toJSON: () => ({}) }
  Range.prototype.getBoundingClientRect ??= () => rect as DOMRect
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  Element.prototype.scrollTo = () => {}
})
afterEach(cleanup)

const log: string[] = []
function Host({ initial }: { initial: string }) {
  const [v, setV] = useState(initial)
  return <><MarkdownEditor value={v} onChange={(x) => { log.push(x); setV(x) }} /><output data-testid="v">{v}</output></>
}

describe('MarkdownEditor (Tiptap)', () => {
  it('mounts in visual mode, renders markdown and does not rewrite it until edited', async () => {
    render(<Host initial={'ola **mundo**\n\n* a\n* b'} />)
    await act(async () => {})
    expect(document.querySelector('.ProseMirror strong')?.textContent).toBe('mundo')
    expect(document.querySelectorAll('.ProseMirror li').length).toBe(2)
    expect(log.length).toBe(0)
    expect(screen.getByTestId('v').textContent).toBe('ola **mundo**\n\n* a\n* b')
  })

  it('toolbar emits Markdown; the code mode shows the source and returns to visual', async () => {
    log.length = 0
    render(<Host initial={'hola'} />)
    await act(async () => {})
    const pm = document.querySelector('.ProseMirror') as HTMLElement
    await act(async () => { pm.focus() })
    await act(async () => { fireEvent.click(screen.getByTitle('Título')) })
    expect(log.at(-1)).toBe('## hola')
    await act(async () => { fireEvent.click(screen.getByTitle('Lista')) })
    await act(async () => { fireEvent.click(screen.getByText('Código')) })
    const area = document.querySelector('textarea.md-textarea') as HTMLTextAreaElement
    expect(area.value).toBe(log.at(-1))
    await act(async () => { fireEvent.change(area, { target: { value: 'novo **texto**' } }) })
    await act(async () => { fireEvent.click(screen.getByText('Visual')) })
    expect(document.querySelector('.ProseMirror strong')?.textContent).toBe('texto')
    expect(screen.getByTestId('v').textContent).toBe('novo **texto**')
  })

  it('the link button without a selection inserts the address as a link', async () => {
    log.length = 0
    window.prompt = () => 'https://kinotest.me'
    render(<Host initial={'ligazon'} />)
    await act(async () => {})
    const pm = document.querySelector('.ProseMirror') as HTMLElement
    await act(async () => { pm.focus() })
    await act(async () => { fireEvent.click(screen.getByTitle('Ligazón')) })
    expect(log.at(-1)).toContain('(https://kinotest.me)')
  })

  it('follows a value that changes from outside', async () => {
    const { rerender } = render(<MarkdownEditor value="uno" onChange={() => {}} />)
    await act(async () => {})
    rerender(<MarkdownEditor value="**dous**" onChange={() => {}} />)
    await act(async () => {})
    expect(document.querySelector('.ProseMirror strong')?.textContent).toBe('dous')
  })
})
