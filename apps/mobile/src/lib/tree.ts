import type { Catalog, Remedy } from '@kinotest/shared'

export type TreeNode = Catalog | Remedy
export type Crumb = { name: string; path: number[] }

export const isCatalog = (node: TreeNode): node is Catalog => node.type === 'catalog'

/** "0.2.1" -> [0, 2, 1]. Anything that is not a list of small non-negative integers gives []. */
export function parsePath(raw: string | null | undefined): number[] {
  if (!raw) return []
  const path: number[] = []
  for (const part of raw.split('.')) {
    if (!/^\d{1,4}$/.test(part)) return []
    path.push(Number(part))
  }
  return path
}

export const formatPath = (path: number[]): string => path.join('.')

export const parentPath = (path: number[]): number[] => path.slice(0, -1)

/** The node at `path` (indexes into `contents`, from the root), or null if the path does not exist. */
export function getNode(root: Catalog, path: number[]): TreeNode | null {
  let node: TreeNode = root
  for (const index of path) {
    if (!isCatalog(node)) return null // cannot go down through a remedy
    const child: TreeNode | undefined = node.contents[index]
    if (!child) return null
    node = child
  }
  return node
}

/**
 * Root plus every catalog on the way to `path`. A remedy at the end is NOT included (the caller adds it
 * if it wants it). Null if the path does not exist.
 */
export function crumbsOf(root: Catalog, path: number[]): Crumb[] | null {
  const crumbs: Crumb[] = [{ name: root.name, path: [] }]
  const walked: number[] = []
  let node: TreeNode = root
  for (const index of path) {
    if (!isCatalog(node)) return null
    const child: TreeNode | undefined = node.contents[index]
    if (!child) return null
    walked.push(index)
    if (isCatalog(child)) crumbs.push({ name: child.name, path: [...walked] })
    node = child
  }
  return crumbs
}

/** The page of a therapy; `path` is the catalog or remedy being shown (empty = the root). */
export const therapyUrl = (id: string, path: number[] = []): string =>
  `/therapies/${encodeURIComponent(id)}${path.length > 0 ? `?path=${formatPath(path)}` : ''}`
