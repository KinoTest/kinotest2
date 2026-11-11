export { crumbsOf, getNode, isCatalog, type Crumb, type TreeNode } from '@kinotest/shared'

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

/**
 * The page of a therapy; `path` is the catalog or remedy being shown (empty = the root).
 * With `search`, the page is the search of the therapy (and `path` is where to come back to).
 */
export const therapyUrl = (id: string, path: number[] = [], search = false): string => {
  const query = [path.length > 0 ? `path=${formatPath(path)}` : '', search ? 'search=1' : ''].filter(Boolean).join('&')
  return `/therapies/${encodeURIComponent(id)}${query ? `?${query}` : ''}`
}
