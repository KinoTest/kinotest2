import type { Catalog, Remedy } from './schemas.ts'

// Walking a content document. A node is addressed by its path: indexes into `contents`, from the root.

export type TreeNode = Catalog | Remedy
export type Crumb = { name: string; path: number[] }

export const isCatalog = (node: TreeNode): node is Catalog => node.type === 'catalog'

/** The node at `path`, or null if the path does not exist. */
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
