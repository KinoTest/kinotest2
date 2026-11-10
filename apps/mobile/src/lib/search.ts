import type { Catalog } from '@kinotest/shared'
import { isCatalog, type TreeNode } from './tree.ts'

/** Points for each search term found in each place. Titles weigh more than descriptions. */
export const POINTS = { description: 1, catalogTitle: 2, remedyTitle: 3 } as const

/** Shorter queries are ignored: they would match almost everything. */
export const MIN_QUERY_LENGTH = 2

export type SearchResult = {
  path: number[] // where it is, as in therapyUrl
  node: TreeNode
  score: number
  trail: string[] // names of the categories above it (the therapy itself not included)
}

/** Lower case and no accents, so "rinon" finds "Riñón". */
export const normalize = (text: string): string => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** Markdown without its markers and link addresses, so only the words are matched. */
export const plainText = (markdown: string): string => markdown.replace(/\]\([^)]*\)/g, ']').replace(/[*_`#>~]/g, '')

/** The distinct words to look for; empty if the query is too short. */
export function parseQuery(query: string): string[] {
  const normalized = normalize(query).trim()
  if (normalized.length < MIN_QUERY_LENGTH) return []
  return [...new Set(normalized.split(/\s+/))]
}

type Entry = { path: number[]; node: TreeNode; trail: string[]; title: string; text: string }

// Normalising every text on each keystroke would be wasteful: do it once per document.
const indexes = new WeakMap<Catalog, Entry[]>()

function indexOf(root: Catalog): Entry[] {
  const cached = indexes.get(root)
  if (cached) return cached
  const entries: Entry[] = []
  const walk = (catalog: Catalog, path: number[], trail: string[]) => {
    catalog.contents.forEach((node, i) => {
      const nodePath = [...path, i]
      const description = isCatalog(node) ? (node.notes ?? '') : node.description
      entries.push({ path: nodePath, node, trail, title: normalize(node.name), text: normalize(plainText(description)) })
      if (isCatalog(node)) walk(node, nodePath, [...trail, node.name])
    })
  }
  walk(root, [], [])
  indexes.set(root, entries)
  return entries
}

/**
 * Searches the name and the description (the notes, for a category) of every category and remedy.
 * - Every word of the query must appear in the element, in its name or in its description.
 * - Each word adds points per place where it is found (once per place, however many times it repeats):
 *   description 1, category name 2, remedy name 3.
 * - Best score first; equal scores keep the order of the document. The therapy itself is never a result.
 */
export function search(root: Catalog, query: string): SearchResult[] {
  const terms = parseQuery(query)
  if (terms.length === 0) return []

  const found: Array<SearchResult & { order: number }> = []
  indexOf(root).forEach((entry, order) => {
    const titlePoints = isCatalog(entry.node) ? POINTS.catalogTitle : POINTS.remedyTitle
    let score = 0
    for (const term of terms) {
      const inTitle = entry.title.includes(term)
      const inText = entry.text.includes(term)
      if (!inTitle && !inText) return // a word is missing: not a result
      if (inTitle) score += titlePoints
      if (inText) score += POINTS.description
    }
    found.push({ path: entry.path, node: entry.node, score, trail: entry.trail, order })
  })

  found.sort((a, b) => b.score - a.score || a.order - b.order)
  return found.map(({ path, node, score, trail }) => ({ path, node, score, trail }))
}
