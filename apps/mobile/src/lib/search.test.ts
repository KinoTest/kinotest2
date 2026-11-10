import type { Catalog, Remedy } from '@kinotest/shared'
import { describe, expect, it } from 'vitest'
import { MIN_QUERY_LENGTH, normalize, parseQuery, plainText, search } from './search.ts'
import { getNode } from './tree.ts'

const remedy = (name: string, description = ''): Remedy => ({ type: 'remedy', name, description, images: [] })
const catalog = (name: string, contents: Catalog['contents'], notes?: string): Catalog => ({
  type: 'catalog',
  name,
  contents,
  ...(notes ? { notes } : {}),
})

// Root (its notes mention "ojo", but the therapy itself is never a result)
//  ├─ Cabeza (notes: "Notas del ojo")
//  │   ├─ Ojo bis        "Problema de cabeza"
//  │   └─ Otro           "* **Patógeno:** ojo ojo"
//  ├─ Ojos
//  └─ Riñón              "x"
const root: Catalog = catalog(
  'Root',
  [
    catalog('Cabeza', [remedy('Ojo bis', 'Problema de cabeza'), remedy('Otro', '* **Patógeno:** ojo ojo')], 'Notas del ojo'),
    catalog('Ojos', []),
    remedy('Riñón', 'x'),
  ],
  'Notas generales: ojo',
)

const names = (query: string) => search(root, query).map((r) => r.node.name)
const scores = (query: string) => search(root, query).map((r) => r.score)

describe('normalize / plainText / parseQuery', () => {
  it('lower-cases and removes accents', () => {
    expect(normalize('Riñón')).toBe('rinon')
    expect(normalize('ÁÉÍÓÚ')).toBe('aeiou')
  })

  it('removes Markdown markers and link addresses', () => {
    expect(plainText('* **Patógeno:** x')).toBe(' Patógeno: x')
    const text = plainText('ver [la guía](http://a.b/c)')
    expect(text).toContain('la guía')
    expect(text).not.toContain('http')
  })

  it('splits into distinct words', () => {
    expect(parseQuery('  Ojo   OJO cabeza ')).toEqual(['ojo', 'cabeza'])
  })

  it('ignores queries that are too short', () => {
    expect(MIN_QUERY_LENGTH).toBe(2)
    expect(parseQuery('')).toEqual([])
    expect(parseQuery(' o ')).toEqual([])
    expect(parseQuery('oj')).toEqual(['oj'])
  })
})

describe('search: points and order', () => {
  it('gives 3 for a remedy name, 2 for a category name and 1 for a description', () => {
    expect(names('ojo')).toEqual(['Ojo bis', 'Ojos', 'Cabeza', 'Otro'])
    expect(scores('ojo')).toEqual([3, 2, 1, 1])
  })

  it('searches the notes of a category as its description', () => {
    expect(names('notas')).toEqual(['Cabeza']) // not the root: the therapy is never a result
  })

  it('adds the points of every place where it is found', () => {
    const doc = catalog('R', [remedy('Ojo seco', 'tratamiento del ojo'), catalog('Ojo', [], 'sobre el ojo')])
    expect(search(doc, 'ojo').map((r) => [r.node.name, r.score])).toEqual([
      ['Ojo seco', 4],
      ['Ojo', 3],
    ])
  })

  it('counts a word once per place, however many times it repeats', () => {
    expect(search(root, 'ojo').find((r) => r.node.name === 'Otro')?.score).toBe(1)
  })

  it('keeps the document order between equal scores', () => {
    expect(names('ojo').slice(2)).toEqual(['Cabeza', 'Otro'])
  })

  it('shows the better title match before the description matches', () => {
    expect(names('cabeza')).toEqual(['Cabeza', 'Ojo bis']) // 2 (category name), then 1 (description)
  })
})

describe('search: several words', () => {
  it('needs every word, in the name or in the description', () => {
    expect(names('ojo cabeza')).toEqual(['Ojo bis', 'Cabeza']) // "Otro" and "Ojos" lack "cabeza"
    expect(scores('ojo cabeza')).toEqual([4, 3])
  })

  it('does not depend on the order of the words', () => {
    expect(names('cabeza ojo')).toEqual(names('ojo cabeza'))
  })
})

describe('search: matching rules', () => {
  it('ignores case and accents in both the query and the text', () => {
    expect(names('rinon')).toEqual(['Riñón'])
    expect(names('RIÑÓN')).toEqual(['Riñón'])
  })

  it('matches part of a word', () => {
    expect(names('cabe')).toEqual(['Cabeza', 'Ojo bis'])
  })

  it('does not match Markdown markers', () => {
    expect(search(root, '**')).toEqual([])
  })

  it('returns nothing for short or unmatched queries', () => {
    expect(search(root, '')).toEqual([])
    expect(search(root, 'o')).toEqual([])
    expect(search(root, 'zzz')).toEqual([])
  })
})

describe('search: location of the results', () => {
  it('gives the path (usable with getNode) and the categories above', () => {
    const [first] = search(root, 'ojo bis')
    expect(first?.path).toEqual([0, 0])
    expect(first?.trail).toEqual(['Cabeza'])
    expect(getNode(root, first?.path ?? [])).toBe(first?.node)
  })

  it('has an empty trail for the first level', () => {
    expect(search(root, 'ojos')[0]?.trail).toEqual([])
  })
})
