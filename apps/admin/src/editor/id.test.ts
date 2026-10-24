import { contentDocumentSchema } from '@kinotest/shared'
import { describe, expect, it } from 'vitest'
import { emptyDocument } from './tree.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('therapy id', () => {
  it('a new therapy gets its own UUID, and the shared schema accepts it', () => {
    const a = emptyDocument().meta.id
    const b = emptyDocument().meta.id
    expect(a).toMatch(UUID)
    expect(a).not.toBe(b)
    expect(contentDocumentSchema.shape.id.safeParse(a).success).toBe(true)
  })

  it('the schema still accepts the older readable ids and rejects what is not an id', () => {
    const id = contentDocumentSchema.shape.id
    expect(id.safeParse('biomagneticPair').success).toBe(true)
    expect(id.safeParse('0f3a9c1e-8b7d-4c52-9a1e-2d6b5f7a8c90').success).toBe(true) // starts with a digit
    expect(id.safeParse('').success).toBe(false)
    expect(id.safeParse('con espazo').success).toBe(false)
    expect(id.safeParse('../x').success).toBe(false)
  })
})
