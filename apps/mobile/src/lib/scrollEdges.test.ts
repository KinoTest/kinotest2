import { describe, expect, it } from 'vitest'
import { scrollEdges } from './scrollEdges.ts'

describe('scrollEdges', () => {
  it('has no hidden content when everything fits', () => {
    expect(scrollEdges(0, 300, 300)).toEqual({ left: false, right: false })
    expect(scrollEdges(0, 300, 120)).toEqual({ left: false, right: false })
  })

  it('has content on the right only at the start', () => {
    expect(scrollEdges(0, 300, 600)).toEqual({ left: false, right: true })
  })

  it('has content on both sides in the middle', () => {
    expect(scrollEdges(120, 300, 600)).toEqual({ left: true, right: true })
  })

  it('has content on the left only at the end', () => {
    expect(scrollEdges(300, 300, 600)).toEqual({ left: true, right: false })
  })

  it('ignores sub-pixel rounding', () => {
    expect(scrollEdges(0.4, 300, 600).left).toBe(false)
    expect(scrollEdges(299.6, 300, 600).right).toBe(false)
  })
})
