import { describe, expect, it } from 'vitest'
import { apply, cmdSetImages, fromDocument, getNode, invert, type RemedyNode } from './tree.ts'

const doc = fromDocument({
  id: 'p', lang: 'es-ES', formatVersion: 1, type: 'catalog', name: 'Par',
  contents: [
    { type: 'catalog', name: 'Cat', contents: [] },
    { type: 'remedy', name: 'A', description: '', images: ['a/1.webp'] },
  ],
})
const catalogId = doc.root.children[0]!.id
const remedyId = doc.root.children[1]!.id
const images = (d: typeof doc) => (getNode(d.root, remedyId) as RemedyNode).images

describe('cmdSetImages', () => {
  it('sets the images and is reversible', () => {
    const cmd = cmdSetImages(doc, remedyId, ['a/2.webp', 'a/1.webp'])!
    const next = apply(doc, cmd)!
    expect(images(next)).toEqual(['a/2.webp', 'a/1.webp'])
    expect(images(apply(next, invert(cmd))!)).toEqual(['a/1.webp'])
  })
  it('does nothing when the images do not change or the node is not a remedy', () => {
    expect(cmdSetImages(doc, remedyId, ['a/1.webp'])).toBeNull()
    expect(cmdSetImages(doc, catalogId, ['a/1.webp'])).toBeNull()
  })
})
