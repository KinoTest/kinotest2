import type { ContentDocument } from '@kinotest/shared'
import { describe, expect, it } from 'vitest'
import {
  apply,
  cmdInsert,
  cmdMove,
  cmdRemove,
  cmdReplaceAll,
  cmdSetField,
  fromDocument,
  getNode,
  insertionParentId,
  invert,
  newCatalog,
  newRemedy,
  ROOT_ID,
  toDocument,
  type CatalogNode,
  type Cmd,
  type EditorDoc,
} from './tree.ts'

const stored: ContentDocument = {
  id: 'biomagneticPair',
  lang: 'es-ES',
  formatVersion: 1,
  type: 'catalog',
  name: 'Par Biomagnético',
  notes: '# Par',
  contents: [
    {
      type: 'catalog',
      name: 'Regular',
      contents: [
        { type: 'remedy', name: 'A', description: 'da', images: ['x/1.webp'] },
        { type: 'remedy', name: 'B', description: 'db', images: [] },
        { type: 'catalog', name: 'Sub', contents: [{ type: 'remedy', name: 'C', description: '', images: [] }] },
      ],
    },
    { type: 'catalog', name: 'Outros', contents: [] },
    { type: 'remedy', name: 'D', description: 'dd', images: [] },
  ],
}

const load = (): EditorDoc => fromDocument(stored)
const names = (c: CatalogNode): string[] => c.children.map((n) => n.name)
const byName = (doc: EditorDoc, name: string) => {
  const find = (n: CatalogNode): string | undefined => {
    for (const c of n.children) {
      if (c.name === name) return c.id
      if (c.type === 'catalog') {
        const r = find(c)
        if (r) return r
      }
    }
  }
  const id = find(doc.root)
  if (!id) throw new Error(`no node ${name}`)
  return id
}
const must = (c: Cmd | null): Cmd => {
  if (!c) throw new Error('no command')
  return c
}
const run = (doc: EditorDoc, c: Cmd): EditorDoc => {
  const next = apply(doc, c)
  if (!next) throw new Error('apply failed')
  return next
}

describe('conversion', () => {
  it('round-trips the stored document', () => {
    expect(toDocument(load())).toEqual(stored)
  })

  it('omits empty notes and gives every node an id', () => {
    const doc = load()
    doc.root.notes = ''
    expect('notes' in toDocument(doc)).toBe(false)
    expect(doc.root.id).toBe(ROOT_ID)
    expect(new Set(JSON.stringify(doc).match(/"id":"[^"]+"/g)).size).toBe(8)
  })
})

describe('every command can be undone', () => {
  it('insert, remove, move and setField', () => {
    const doc = load()
    const regular = byName(doc, 'Regular')
    const cmds: Cmd[] = [
      must(cmdInsert(doc, regular, newRemedy('Nova'))),
      must(cmdRemove(doc, byName(doc, 'B'))),
      must(cmdMove(doc, byName(doc, 'D'), regular, 1)),
      must(cmdMove(doc, byName(doc, 'Sub'), ROOT_ID, 0)),
      must(cmdSetField(doc, byName(doc, 'A'), 'description', 'novo')),
    ]
    for (const c of cmds) {
      const changed = run(doc, c)
      expect(changed).not.toEqual(doc)
      expect(run(changed, invert(c))).toEqual(doc)
    }
  })
})

describe('replaceAll', () => {
  it('swaps the whole therapy and can be undone', () => {
    const doc = load()
    const other = fromDocument({ ...stored, id: 'other', name: 'Outra', contents: [] })
    const c = cmdReplaceAll(doc, other)
    const swapped = run(doc, c)
    expect(toDocument(swapped).name).toBe('Outra')
    expect(run(swapped, invert(c))).toEqual(doc)
  })
})

describe('moves', () => {
  it('a container takes its content with it', () => {
    const doc = load()
    const moved = run(doc, must(cmdMove(doc, byName(doc, 'Sub'), byName(doc, 'Outros'), 0)))
    const outros = getNode(moved.root, byName(moved, 'Outros'))
    expect(outros?.type === 'catalog' && names(outros)).toEqual(['Sub'])
    expect(getNode(moved.root, byName(moved, 'C'))).not.toBeNull()
  })

  it('reordering inside one container accounts for the node leaving its place', () => {
    const doc = load()
    const regular = byName(doc, 'Regular')
    // dropping A "before Sub" (index 2 of the original list) leaves it right before Sub: A is already there
    expect(cmdMove(doc, byName(doc, 'A'), regular, 1)).toBeNull()
    const moved = run(doc, must(cmdMove(doc, byName(doc, 'A'), regular, 3)))
    expect(names(getNode(moved.root, regular) as CatalogNode)).toEqual(['B', 'Sub', 'A'])
  })

  it('refuses to put a container inside itself or its descendants, and to move the root', () => {
    const doc = load()
    expect(cmdMove(doc, byName(doc, 'Regular'), byName(doc, 'Sub'), 0)).toBeNull()
    expect(cmdMove(doc, byName(doc, 'Regular'), byName(doc, 'Regular'), 0)).toBeNull()
    expect(cmdMove(doc, ROOT_ID, byName(doc, 'Outros'), 0)).toBeNull()
  })

  it('refuses a remedy as destination', () => {
    const doc = load()
    expect(cmdMove(doc, byName(doc, 'A'), byName(doc, 'D'), 0)).toBeNull()
  })
})

describe('guards', () => {
  it('cannot remove the root', () => {
    expect(cmdRemove(load(), ROOT_ID)).toBeNull()
  })

  it('a command whose node disappeared does not apply', () => {
    const doc = load()
    const edit = must(cmdSetField(doc, byName(doc, 'A'), 'name', 'AA'))
    const gone = run(doc, must(cmdRemove(doc, byName(doc, 'A'))))
    expect(apply(gone, edit)).toBeNull()
  })

  it('description only exists on remedies, notes only on containers', () => {
    const doc = load()
    expect(cmdSetField(doc, byName(doc, 'Regular'), 'description', 'x')).toBeNull()
    expect(cmdSetField(doc, byName(doc, 'A'), 'notes', 'x')).toBeNull()
    expect(cmdSetField(doc, byName(doc, 'A'), 'name', 'A')).toBeNull() // unchanged
  })

  it('does not insert the same node twice', () => {
    const doc = load()
    const c = must(cmdInsert(doc, ROOT_ID, newCatalog('X')))
    expect(apply(run(doc, c), c)).toBeNull()
  })
})

describe('where new entries go', () => {
  it('inside a selected container, beside a selected remedy, at the top otherwise', () => {
    const doc = load()
    expect(insertionParentId(doc, byName(doc, 'Outros'))).toBe(byName(doc, 'Outros'))
    expect(insertionParentId(doc, byName(doc, 'C'))).toBe(byName(doc, 'Sub'))
    expect(insertionParentId(doc, null)).toBe(ROOT_ID)
  })
})
