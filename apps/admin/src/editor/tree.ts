import { CONTENT_FORMAT_VERSION, type Catalog, type ContentDocument, type Remedy } from '@kinotest/shared'

// Editing model of a therapy. It mirrors the stored JSON (see `contentDocumentSchema`) but every node
// has an `id` so selection, drag and drop and undo can point at it. The ids only live in the editor:
// they are generated when a document is loaded and dropped when it is saved.

export interface RemedyNode {
  id: string
  type: 'remedy'
  name: string
  description: string
  images: string[]
}
export interface CatalogNode {
  id: string
  type: 'catalog'
  name: string
  notes: string
  children: TreeNode[]
}
export type TreeNode = CatalogNode | RemedyNode

export interface EditorMeta {
  id: string
  lang: string
}
export interface EditorDoc {
  meta: EditorMeta
  /** The therapy itself: its `name` and `notes` are the therapy's, its `children` are the top-level entries. */
  root: CatalogNode
}

export const ROOT_ID = 'root'

let seq = 0
export const newId = (): string => `n${(++seq).toString(36)}${Math.random().toString(36).slice(2, 8)}`

export const isCatalog = (n: TreeNode): n is CatalogNode => n.type === 'catalog'

export const newRemedy = (name = 'Novo remedio'): RemedyNode => ({
  id: newId(),
  type: 'remedy',
  name,
  description: '',
  images: [],
})
export const newCatalog = (name = 'Novo contedor'): CatalogNode => ({
  id: newId(),
  type: 'catalog',
  name,
  notes: '',
  children: [],
})

export const emptyDocument = (): EditorDoc => ({
  meta: { id: crypto.randomUUID(), lang: 'es-ES' },
  root: { id: ROOT_ID, type: 'catalog', name: '', notes: '', children: [] },
})

// --- Conversion to and from the stored document ---

const fromEntry = (e: Catalog | Remedy): TreeNode =>
  e.type === 'remedy'
    ? { id: newId(), type: 'remedy', name: e.name, description: e.description, images: [...e.images] }
    : { id: newId(), type: 'catalog', name: e.name, notes: e.notes ?? '', children: e.contents.map(fromEntry) }

export const fromDocument = (doc: ContentDocument): EditorDoc => ({
  meta: { id: doc.id, lang: doc.lang },
  root: {
    id: ROOT_ID,
    type: 'catalog',
    name: doc.name,
    notes: doc.notes ?? '',
    children: doc.contents.map(fromEntry),
  },
})

const toEntry = (n: TreeNode): Catalog | Remedy =>
  n.type === 'remedy'
    ? { type: 'remedy', name: n.name, description: n.description, images: [...n.images] }
    : { type: 'catalog', name: n.name, ...(n.notes ? { notes: n.notes } : {}), contents: n.children.map(toEntry) }

/** Not validated: run it through `contentDocumentSchema` before saving. */
export const toDocument = (ed: EditorDoc): ContentDocument => ({
  id: ed.meta.id,
  lang: ed.meta.lang,
  formatVersion: CONTENT_FORMAT_VERSION,
  type: 'catalog',
  name: ed.root.name,
  ...(ed.root.notes ? { notes: ed.root.notes } : {}),
  contents: ed.root.children.map(toEntry),
})

// --- Reading the tree ---

export function getNode(node: TreeNode, id: string): TreeNode | null {
  if (node.id === id) return node
  if (node.type === 'remedy') return null
  for (const child of node.children) {
    const found = getNode(child, id)
    if (found) return found
  }
  return null
}

export function findParent(root: CatalogNode, id: string): { parent: CatalogNode; index: number } | null {
  for (let index = 0; index < root.children.length; index++) {
    const child = root.children[index]
    if (!child) continue
    if (child.id === id) return { parent: root, index }
    if (child.type === 'catalog') {
      const found = findParent(child, id)
      if (found) return found
    }
  }
  return null
}

/** True if `id` is `node` itself or one of its descendants. */
export const isWithin = (node: TreeNode, id: string): boolean => getNode(node, id) !== null

export function countRemedies(node: TreeNode): number {
  return node.type === 'remedy' ? 1 : node.children.reduce((sum, c) => sum + countRemedies(c), 0)
}

// --- Immutable updates (unchanged branches keep their identity) ---

function mapNode(node: TreeNode, id: string, fn: (n: TreeNode) => TreeNode): TreeNode {
  if (node.id === id) return fn(node)
  if (node.type === 'remedy') return node
  let changed = false
  const children = node.children.map((c) => {
    const next = mapNode(c, id, fn)
    if (next !== c) changed = true
    return next
  })
  return changed ? { ...node, children } : node
}

function updateCatalog(root: CatalogNode, id: string, fn: (c: CatalogNode) => CatalogNode): CatalogNode {
  const next = mapNode(root, id, (n) => (n.type === 'catalog' ? fn(n) : n))
  return next.type === 'catalog' ? next : root
}

// --- Commands: every change to the document, reversible and addressed by node id ---

export type Field = 'name' | 'description' | 'notes'

export type Cmd =
  | { kind: 'setField'; id: string; field: Field; before: string; after: string }
  /** Replaces the image keys of a remedy (add, remove, replace and reorder all come down to this). */
  | { kind: 'setImages'; id: string; before: string[]; after: string[] }
  | { kind: 'setMeta'; field: keyof EditorMeta; before: string; after: string }
  /** The whole therapy is swapped (importing a file into the editor). */
  | { kind: 'replaceAll'; before: EditorDoc; after: EditorDoc }
  | { kind: 'insert'; parentId: string; index: number; node: TreeNode }
  | { kind: 'remove'; parentId: string; index: number; node: TreeNode }
  /** `toIndex` is the position inside the destination once the node has been taken out of its old place. */
  | { kind: 'move'; id: string; fromParentId: string; fromIndex: number; toParentId: string; toIndex: number }

export function invert(c: Cmd): Cmd {
  switch (c.kind) {
    case 'setField':
    case 'setMeta':
      return { ...c, before: c.after, after: c.before }
    case 'setImages':
      return { ...c, before: c.after, after: c.before }
    case 'replaceAll':
      return { kind: 'replaceAll', before: c.after, after: c.before }
    case 'insert':
      return { kind: 'remove', parentId: c.parentId, index: c.index, node: c.node }
    case 'remove':
      return { kind: 'insert', parentId: c.parentId, index: c.index, node: c.node }
    case 'move':
      return {
        kind: 'move',
        id: c.id,
        fromParentId: c.toParentId,
        fromIndex: c.toIndex,
        toParentId: c.fromParentId,
        toIndex: c.fromIndex,
      }
  }
}

function withoutChild(root: CatalogNode, parentId: string, index: number, id: string): CatalogNode | null {
  const parent = getNode(root, parentId)
  if (!parent || parent.type !== 'catalog' || parent.children[index]?.id !== id) return null
  return updateCatalog(root, parentId, (p) => ({ ...p, children: p.children.filter((_, i) => i !== index) }))
}

function withChild(root: CatalogNode, parentId: string, index: number, node: TreeNode): CatalogNode | null {
  const parent = getNode(root, parentId)
  if (!parent || parent.type !== 'catalog' || index < 0 || index > parent.children.length) return null
  return updateCatalog(root, parentId, (p) => ({
    ...p,
    children: [...p.children.slice(0, index), node, ...p.children.slice(index)],
  }))
}

/** Applies a command. Returns null if it no longer fits the document (e.g. its node was removed). */
export function apply(doc: EditorDoc, c: Cmd): EditorDoc | null {
  switch (c.kind) {
    case 'replaceAll':
      return c.after
    case 'setMeta':
      return { ...doc, meta: { ...doc.meta, [c.field]: c.after } }
    case 'setField': {
      const node = getNode(doc.root, c.id)
      if (!node) return null
      if (c.field === 'description' && node.type !== 'remedy') return null
      if (c.field === 'notes' && node.type !== 'catalog') return null
      const root = updateCatalog(doc.root, ROOT_ID, (r) => mapNode(r, c.id, (n) => ({ ...n, [c.field]: c.after })) as CatalogNode)
      return { ...doc, root }
    }
    case 'setImages': {
      const node = getNode(doc.root, c.id)
      if (!node || node.type !== 'remedy') return null
      const root = updateCatalog(doc.root, ROOT_ID, (r) => mapNode(r, c.id, (n) => ({ ...n, images: c.after })) as CatalogNode)
      return { ...doc, root }
    }
    case 'insert': {
      if (getNode(doc.root, c.node.id)) return null
      const root = withChild(doc.root, c.parentId, c.index, c.node)
      return root && { ...doc, root }
    }
    case 'remove': {
      if (c.node.id === ROOT_ID) return null
      const root = withoutChild(doc.root, c.parentId, c.index, c.node.id)
      return root && { ...doc, root }
    }
    case 'move': {
      if (c.id === ROOT_ID) return null
      const moved = getNode(doc.root, c.id)
      if (!moved || isWithin(moved, c.toParentId)) return null
      const without = withoutChild(doc.root, c.fromParentId, c.fromIndex, c.id)
      const root = without && withChild(without, c.toParentId, c.toIndex, moved)
      return root && { ...doc, root }
    }
  }
}

// --- Building commands from the current document (null = nothing to do) ---

export function cmdInsert(doc: EditorDoc, parentId: string, node: TreeNode, index?: number): Cmd | null {
  const parent = getNode(doc.root, parentId)
  if (!parent || parent.type !== 'catalog') return null
  return { kind: 'insert', parentId, index: index ?? parent.children.length, node }
}

export function cmdRemove(doc: EditorDoc, id: string): Cmd | null {
  if (id === ROOT_ID) return null
  const loc = findParent(doc.root, id)
  const node = loc?.parent.children[loc.index]
  return loc && node ? { kind: 'remove', parentId: loc.parent.id, index: loc.index, node } : null
}

/** `rawIndex` is the drop position among the destination's children before the node leaves its old place. */
export function cmdMove(doc: EditorDoc, id: string, toParentId: string, rawIndex: number): Cmd | null {
  if (id === ROOT_ID) return null
  const loc = findParent(doc.root, id)
  const moved = loc?.parent.children[loc.index]
  const target = getNode(doc.root, toParentId)
  if (!loc || !moved || !target || target.type !== 'catalog' || isWithin(moved, toParentId)) return null
  let toIndex = rawIndex
  if (loc.parent.id === toParentId && loc.index < rawIndex) toIndex -= 1
  const room = target.children.length - (loc.parent.id === toParentId ? 1 : 0)
  toIndex = Math.max(0, Math.min(toIndex, room))
  if (loc.parent.id === toParentId && toIndex === loc.index) return null
  return { kind: 'move', id, fromParentId: loc.parent.id, fromIndex: loc.index, toParentId, toIndex }
}

export function cmdSetField(doc: EditorDoc, id: string, field: Field, after: string): Cmd | null {
  const node = getNode(doc.root, id)
  if (!node) return null
  const before = field === 'name' ? node.name : field === 'description' ? (node.type === 'remedy' ? node.description : null) : node.type === 'catalog' ? node.notes : null
  return before === null || before === after ? null : { kind: 'setField', id, field, before, after }
}

export function cmdSetImages(doc: EditorDoc, id: string, after: string[]): Cmd | null {
  const node = getNode(doc.root, id)
  if (!node || node.type !== 'remedy') return null
  const same = node.images.length === after.length && node.images.every((k, i) => k === after[i])
  return same ? null : { kind: 'setImages', id, before: node.images, after }
}

export const cmdReplaceAll = (doc: EditorDoc, next: EditorDoc): Cmd => ({ kind: 'replaceAll', before: doc, after: next })

export function cmdSetMeta(doc: EditorDoc, field: keyof EditorMeta, after: string): Cmd | null {
  const before = doc.meta[field]
  return before === after ? null : { kind: 'setMeta', field, before, after }
}

/** Where a new entry goes: inside the selected container, beside the selected remedy, or at the top level. */
export function insertionParentId(doc: EditorDoc, selectedId: string | null): string {
  const node = selectedId ? getNode(doc.root, selectedId) : null
  if (!node) return ROOT_ID
  if (node.type === 'catalog') return node.id
  return findParent(doc.root, node.id)?.parent.id ?? ROOT_ID
}
