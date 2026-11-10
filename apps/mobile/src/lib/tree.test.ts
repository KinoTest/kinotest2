import type { Catalog, Remedy } from '@kinotest/shared'
import { describe, expect, it } from 'vitest'
import { crumbsOf, formatPath, getNode, isCatalog, parentPath, parsePath, therapyUrl } from './tree.ts'

const remedy = (name: string): Remedy => ({ type: 'remedy', name, description: '', images: [] })

// root
//  ├─ 0: A (catalog)
//  │   ├─ 0: r0 (remedy)
//  │   └─ 1: B (catalog)
//  │       └─ 0: r1 (remedy)
//  └─ 1: top (remedy)
const root: Catalog = {
  type: 'catalog',
  name: 'Root',
  contents: [
    {
      type: 'catalog',
      name: 'A',
      contents: [remedy('r0'), { type: 'catalog', name: 'B', contents: [remedy('r1')] }],
    },
    remedy('top'),
  ],
}

describe('parsePath / formatPath', () => {
  it('parses a dotted list of indexes', () => {
    expect(parsePath('0.2.1')).toEqual([0, 2, 1])
    expect(parsePath('7')).toEqual([7])
  })

  it('gives the root for empty or missing values', () => {
    expect(parsePath('')).toEqual([])
    expect(parsePath(null)).toEqual([])
    expect(parsePath(undefined)).toEqual([])
  })

  it.each(['a', '1..2', '-1', '1.', '.1', '1.x', '12345', '1,2', '1.5e3'])('treats %j as the root', (raw) => {
    expect(parsePath(raw)).toEqual([])
  })

  it('round-trips', () => {
    expect(parsePath(formatPath([3, 0, 12]))).toEqual([3, 0, 12])
    expect(formatPath([])).toBe('')
  })
})

describe('parentPath', () => {
  it('drops the last index', () => {
    expect(parentPath([0, 1, 0])).toEqual([0, 1])
    expect(parentPath([4])).toEqual([])
    expect(parentPath([])).toEqual([])
  })
})

describe('getNode', () => {
  it('finds the root, categories and remedies', () => {
    expect(getNode(root, [])).toBe(root)
    expect(getNode(root, [0])?.name).toBe('A')
    expect(getNode(root, [0, 1, 0])?.name).toBe('r1')
    expect(getNode(root, [1])?.name).toBe('top')
  })

  it('returns null when an index does not exist', () => {
    expect(getNode(root, [2])).toBeNull()
    expect(getNode(root, [0, 5])).toBeNull()
  })

  it('returns null when the path goes down through a remedy', () => {
    expect(getNode(root, [1, 0])).toBeNull()
    expect(getNode(root, [0, 0, 0])).toBeNull()
  })

  it('tells categories from remedies', () => {
    expect(isCatalog(getNode(root, [0])!)).toBe(true)
    expect(isCatalog(getNode(root, [1])!)).toBe(false)
  })
})

describe('crumbsOf', () => {
  it('has only the root for the root path', () => {
    expect(crumbsOf(root, [])).toEqual([{ name: 'Root', path: [] }])
  })

  it('has one crumb per category on the way, with its own path', () => {
    expect(crumbsOf(root, [0, 1])).toEqual([
      { name: 'Root', path: [] },
      { name: 'A', path: [0] },
      { name: 'B', path: [0, 1] },
    ])
  })

  it('leaves out a remedy at the end', () => {
    expect(crumbsOf(root, [0, 0])).toEqual([
      { name: 'Root', path: [] },
      { name: 'A', path: [0] },
    ])
    expect(crumbsOf(root, [1])).toEqual([{ name: 'Root', path: [] }])
  })

  it('returns null for paths that do not exist', () => {
    expect(crumbsOf(root, [0, 5])).toBeNull()
    expect(crumbsOf(root, [1, 0])).toBeNull()
  })

  it('does not share the path arrays between crumbs', () => {
    const crumbs = crumbsOf(root, [0, 1])!
    crumbs[1]!.path.push(99)
    expect(crumbs[2]!.path).toEqual([0, 1])
  })
})

describe('therapyUrl', () => {
  it('has no query for the root', () => {
    expect(therapyUrl('abc')).toBe('/therapies/abc')
    expect(therapyUrl('abc', [])).toBe('/therapies/abc')
  })

  it('puts the path in the query', () => {
    expect(therapyUrl('abc', [0, 2])).toBe('/therapies/abc?path=0.2')
  })

  it('marks the search page, keeping the place to come back to', () => {
    expect(therapyUrl('abc', [], true)).toBe('/therapies/abc?search=1')
    expect(therapyUrl('abc', [0, 2], true)).toBe('/therapies/abc?path=0.2&search=1')
  })

  it('encodes the id', () => {
    expect(therapyUrl('a/b c')).toBe('/therapies/a%2Fb%20c')
  })
})
