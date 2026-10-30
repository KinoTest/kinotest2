import { describe, expect, it } from 'vitest'
import { buildImageKey, MemoryImageStore } from '../src/media/imageStore.ts'

const HASH = 'a'.repeat(64)

describe('buildImageKey', () => {
  it('builds <contentId>/<hash>.webp', () => {
    expect(buildImageKey('c1', HASH)).toBe(`c1/${HASH}.webp`)
  })
  it('rejects hashes that are not sha256 hex', () => {
    expect(() => buildImageKey('c1', '../x')).toThrow()
    expect(() => buildImageKey('c1', 'A'.repeat(64))).toThrow()
  })
})

describe('MemoryImageStore', () => {
  it('reports existence after put', async () => {
    const s = new MemoryImageStore()
    const key = buildImageKey('c1', HASH)
    expect(await s.exists(key)).toBe(false)
    s.put(key)
    expect(await s.exists(key)).toBe(true)
  })
  it('returns an upload URL containing the key', async () => {
    const url = await new MemoryImageStore().createUploadUrl('c1/x.webp', 'image/webp')
    expect(url).toContain('c1/x.webp')
  })
})
