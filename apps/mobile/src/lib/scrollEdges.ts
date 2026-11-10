export type Edges = { left: boolean; right: boolean }

/** Whether a horizontally scrollable box has hidden content on its left and on its right. */
export function scrollEdges(scrollLeft: number, clientWidth: number, scrollWidth: number): Edges {
  const slack = 1 // sub-pixel rounding in browsers
  return {
    left: scrollLeft > slack,
    right: scrollLeft + clientWidth < scrollWidth - slack,
  }
}
