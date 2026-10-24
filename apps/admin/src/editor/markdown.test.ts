import { describe, expect, it } from 'vitest'
import { applyFormat } from './markdown.ts'

describe('inline formats', () => {
  it('wraps the selection and unwraps it again', () => {
    const a = applyFormat('un remedio bo', 3, 10, 'bold')
    expect(a.text).toBe('un **remedio** bo')
    expect(a.text.slice(a.start, a.end)).toBe('remedio')
    const b = applyFormat(a.text, a.start, a.end, 'bold')
    expect(b.text).toBe('un remedio bo')
    expect(b.text.slice(b.start, b.end)).toBe('remedio')
  })

  it('unwraps when the marks are inside the selection', () => {
    expect(applyFormat('a _b_ c', 2, 5, 'italic').text).toBe('a b c')
  })

  it('inserts a placeholder when nothing is selected', () => {
    const r = applyFormat('', 0, 0, 'bold')
    expect(r.text).toBe('**texto**')
    expect(r.text.slice(r.start, r.end)).toBe('texto')
  })

  it('bold and italic do not mistake each other', () => {
    expect(applyFormat('**a**', 2, 3, 'italic').text).toBe('**_a_**')
  })
})

describe('line formats', () => {
  it('makes a bullet list from several lines, and removes it', () => {
    const a = applyFormat('un\ndous\ntres', 0, 12, 'bullet')
    expect(a.text).toBe('* un\n* dous\n* tres')
    expect(applyFormat(a.text, a.start, a.end, 'bullet').text).toBe('un\ndous\ntres')
  })

  it('only touches the lines the selection reaches', () => {
    expect(applyFormat('a\nb\nc', 2, 3, 'quote').text).toBe('a\n> b\nc')
  })

  it('numbers the lines in order', () => {
    expect(applyFormat('a\nb', 0, 3, 'numbered').text).toBe('1. a\n2. b')
  })

  it('turns a bullet list into a numbered one instead of stacking prefixes', () => {
    expect(applyFormat('* a\n* b', 0, 7, 'numbered').text).toBe('1. a\n2. b')
  })

  it('toggles a heading', () => {
    const a = applyFormat('Titulo', 0, 0, 'heading')
    expect(a.text).toBe('## Titulo')
    expect(applyFormat(a.text, 0, 0, 'heading').text).toBe('Titulo')
  })

  it('leaves blank lines alone', () => {
    expect(applyFormat('a\n\nb', 0, 4, 'bullet').text).toBe('* a\n\n* b')
  })
})

describe('link', () => {
  it('wraps the selection and selects the address', () => {
    const r = applyFormat('ver web', 4, 7, 'link')
    expect(r.text).toBe('ver [web](https://)')
    expect(r.text.slice(r.start, r.end)).toBe('https://')
  })
})
