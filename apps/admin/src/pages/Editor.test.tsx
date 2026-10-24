// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import Editor from './Editor.tsx'
import { deleteContent, getContent } from '../lib/content.ts'

vi.mock('../lib/content.ts', () => ({
  getContent: vi.fn(),
  createContent: vi.fn(),
  replaceContent: vi.fn(),
  deleteContent: vi.fn(),
}))

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 500 })
  globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} } as never
  window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as never
  Element.prototype.scrollTo = () => {}
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const row = {
  id: 'abc', slug: 'p', lang: 'es-ES', title: 'Par', formatVersion: 1, authorId: 'u', createdAt: '', updatedAt: '',
  data: { id: 'p', lang: 'es-ES', formatVersion: 1, type: 'catalog', name: 'Par', contents: [] },
}

const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/content/new" element={<Editor />} />
        <Route path="/content/:id/edit" element={<Editor />} />
      </Routes>
    </MemoryRouter>,
  )

describe('Editor page', () => {
  it('keeps the same page element while the therapy loads (a swapped IonPage stays blank in Ionic)', async () => {
    vi.mocked(getContent).mockResolvedValue(row)
    const { container } = open('/content/abc/edit')
    const page = container.querySelector('.ion-page')
    expect(page).not.toBeNull()
    expect(screen.getByText('Cargando…')).toBeTruthy()
    expect(await screen.findByDisplayValue('Par')).toBeTruthy()
    expect(container.querySelector('.ion-page')).toBe(page)
    expect(container.querySelectorAll('.ion-page')).toHaveLength(1)
  })

  it('shows the error if the therapy cannot be loaded', async () => {
    vi.mocked(getContent).mockRejectedValue(new Error('Non atopado'))
    open('/content/abc/edit')
    expect(await screen.findByText('Non atopado')).toBeTruthy()
  })

  it('a new therapy opens straight away', () => {
    open('/content/new')
    expect(screen.getByLabelText('Terapia')).toBeTruthy()
  })

  it('Borrar and Substituír live here: Borrar only for a saved therapy and it asks first', async () => {
    vi.mocked(getContent).mockResolvedValue(row)
    vi.mocked(deleteContent).mockResolvedValue(undefined)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    open('/content/abc/edit')
    await screen.findByDisplayValue('Par')
    expect(screen.getByText('Substituír')).toBeTruthy()

    await act(async () => { fireEvent.click(screen.getByText('Borrar')) })
    expect(confirm).toHaveBeenCalled()
    expect(deleteContent).not.toHaveBeenCalled()

    confirm.mockReturnValue(true)
    await act(async () => { fireEvent.click(screen.getByText('Borrar')) })
    expect(deleteContent).toHaveBeenCalledWith('abc')

    cleanup()
    open('/content/new')
    expect(screen.queryByText('Borrar')).toBeNull()
    expect(screen.getByText('Substituír')).toBeTruthy()
  })

  it('Substituír loads a file into the editor, leaves it unsaved and rejects a bad file', async () => {
    vi.mocked(getContent).mockResolvedValue(row)
    const { container } = open('/content/abc/edit')
    await screen.findByDisplayValue('Par')
    const input = container.querySelector('input[type=file]') as HTMLInputElement
    const pick = async (text: string) => {
      const file = new File([text], 'x.json', { type: 'application/json' })
      await act(async () => { fireEvent.change(input, { target: { files: [file] } }) })
    }

    await pick('no é json')
    expect(await screen.findByText('O ficheiro non é un JSON válido.')).toBeTruthy()

    await pick(JSON.stringify({ ...row.data, name: 'Outra terapia' }))
    expect(await screen.findByDisplayValue('Outra terapia')).toBeTruthy()
    expect(screen.getByText('Outra terapia •')).toBeTruthy() // unsaved changes marker
  })
})
