import { beforeEach, describe, expect, it } from 'vitest'
import { env } from '../src/env.ts'
import { buildImageKey, imageStore, MemoryImageStore } from '../src/media/index.ts'
import { api, login } from './helpers.ts'

const HASH = 'b'.repeat(64)
const store = imageStore as MemoryImageStore
const URL = '/api/content/images/presign'

describe('POST /api/content/images/presign', () => {
  beforeEach(() => store.keys.clear())

  it('requires authentication', async () => {
    await api().post(URL).send({ contentId: 'c1', hash: HASH }).expect(401)
  })

  it('is forbidden for a regular user', async () => {
    const s = await login('user@example.com')
    await api().post(URL).set('Authorization', `Bearer ${s.accessToken}`).send({ contentId: 'c1', hash: HASH }).expect(403)
  })

  it('rejects a malformed hash or contentId', async () => {
    const s = await login(env.OWNER_EMAIL!)
    const auth = { Authorization: `Bearer ${s.accessToken}` }
    await api().post(URL).set(auth).send({ contentId: 'c1', hash: '../x' }).expect(400)
    await api().post(URL).set(auth).send({ contentId: '../c', hash: HASH }).expect(400)
  })

  it('returns an upload URL for a new image and none when it already exists', async () => {
    const s = await login(env.OWNER_EMAIL!)
    const auth = { Authorization: `Bearer ${s.accessToken}` }
    const key = buildImageKey('c1', HASH)

    const first = await api().post(URL).set(auth).send({ contentId: 'c1', hash: HASH }).expect(200)
    expect(first.body).toMatchObject({ key, exists: false })
    expect(first.body.uploadUrl).toContain(key)

    store.put(key)
    const second = await api().post(URL).set(auth).send({ contentId: 'c1', hash: HASH }).expect(200)
    expect(second.body).toEqual({ key, exists: true })
  })
})
