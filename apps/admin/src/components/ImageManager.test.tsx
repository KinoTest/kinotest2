// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ImageManager from './ImageManager.tsx'
import { fromDocument, getNode, type RemedyNode } from '../editor/tree.ts'
import { useEditorStore } from '../editor/useEditorStore.ts'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
})

const doc = fromDocument({
  id: 'p', lang: 'es-ES', formatVersion: 1, type: 'catalog', name: 'Par',
  contents: [{ type: 'remedy', name: 'A', description: '', images: ['a/1.webp', 'a/2.webp', 'a/3.webp'] }],
})
const remedyId = (doc.root.children[0] as RemedyNode).id

function App() {
  const store = useEditorStore(doc)
  const remedy = getNode(store.state.doc.root, remedyId) as RemedyNode
  return (
    <>
      <ImageManager store={store} remedy={remedy} contentId="p" />
      <output data-testid="keys">{remedy.images.join(',')}</output>
    </>
  )
}
const keys = () => screen.getByTestId('keys').textContent

describe('ImageManager', () => {
  it('reorders and removes images', async () => {
    render(<App />)
    expect(keys()).toBe('a/1.webp,a/2.webp,a/3.webp')
    expect((screen.getAllByTitle('Mover cara atrás')[0] as HTMLButtonElement).disabled).toBe(true)

    await act(async () => { fireEvent.click(screen.getAllByTitle('Mover cara adiante')[0]!) })
    expect(keys()).toBe('a/2.webp,a/1.webp,a/3.webp')

    await act(async () => { fireEvent.click(screen.getAllByTitle('Eliminar')[0]!) })
    expect(keys()).toBe('a/1.webp,a/3.webp')
  })

  it('warns when VITE_MEDIA_URL is missing, since no thumbnail can be built', () => {
    vi.stubEnv('VITE_MEDIA_URL', '') // the root .env may define it: tests must not depend on it
    const { container } = render(<App />)
    expect(screen.getByText(/Falta VITE_MEDIA_URL/)).toBeTruthy()
    expect(container.querySelectorAll('img').length).toBe(0)
  })

  it('shows a thumbnail per image when VITE_MEDIA_URL is set', () => {
    vi.stubEnv('VITE_MEDIA_URL', 'http://media.test/')
    const { container } = render(<App />)
    expect(screen.queryByText(/Falta VITE_MEDIA_URL/)).toBeNull()
    const srcs = Array.from(container.querySelectorAll('img'), (i) => i.getAttribute('src'))
    expect(srcs).toEqual(['http://media.test/a/1.webp', 'http://media.test/a/2.webp', 'http://media.test/a/3.webp'])
  })
})
