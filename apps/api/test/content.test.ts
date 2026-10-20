import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.ts'
import { api, login } from './helpers.ts'

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

// `owner@test.com` is the OWNER_EMAIL of the test environment (see vitest.config.ts).
const asOwner = () => login('owner@test.com')
const asUser = () => login('user@test.com')

const remedy = (name = 'Lunar / Riñón homolateral') => ({
  type: 'remedy',
  name,
  description: '\n* **Patógeno:** Vírus - Hantavirus.\n',
  images: ['biomagnetic-pair/abc123.webp'],
})

const doc = (over: Record<string, unknown> = {}) => ({
  id: 'biomagneticPair',
  lang: 'es-ES',
  name: 'Par Biomagnético',
  type: 'catalog',
  notes: '# Par Biomagnético',
  contents: [{ type: 'catalog', name: 'Regular', contents: [remedy()] }],
  ...over,
})

const createItem = (authorId: string, over: Record<string, unknown> = {}, createdAt?: Date) => {
  const d = doc(over)
  return prisma.contentItem.create({
    data: {
      slug: d.id as string,
      lang: d.lang as string,
      title: d.name as string,
      data: { ...d, formatVersion: 1 } as never,
      authorId,
      ...(createdAt && { createdAt }),
    },
  })
}

describe('authentication', () => {
  it('401 without token on every route', async () => {
    await api().get('/api/content').expect(401)
    await api().get('/api/content/abc').expect(401)
    await api().post('/api/content').send(doc()).expect(401)
    await api().put('/api/content/abc').send(doc()).expect(401)
    await api().delete('/api/content/abc').expect(401)
  })
})

describe('GET /api/content', () => {
  it('a normal user can list', async () => {
    const user = await asUser()
    const res = await api().get('/api/content').set(bearer(user.accessToken)).expect(200)
    expect(res.body).toEqual([])
  })

  it('lists newest first, as summaries without `data`', async () => {
    const owner = await asOwner()
    await createItem(owner.user.id, { id: 'old', name: 'old' }, new Date('2026-01-01'))
    await createItem(owner.user.id, { id: 'new', name: 'new' }, new Date('2026-06-01'))
    const res = await api().get('/api/content').set(bearer(owner.accessToken)).expect(200)
    expect(res.body.map((i: { title: string }) => i.title)).toEqual(['new', 'old'])
    expect(res.body[0]).toMatchObject({ slug: 'new', lang: 'es-ES', formatVersion: 1 })
    expect(res.body[0]).not.toHaveProperty('data')
  })
})

describe('GET /api/content/:id', () => {
  it('returns the whole document, 404 if unknown', async () => {
    const owner = await asOwner()
    const user = await asUser()
    const item = await createItem(owner.user.id)
    const res = await api().get(`/api/content/${item.id}`).set(bearer(user.accessToken)).expect(200)
    expect(res.body.data.contents[0].contents[0].name).toBe('Lunar / Riñón homolateral')
    await api().get('/api/content/does-not-exist').set(bearer(user.accessToken)).expect(404)
  })
})

describe('permissions (403 for a normal user)', () => {
  it('cannot create, replace or delete', async () => {
    const owner = await asOwner()
    const user = await asUser()
    const item = await createItem(owner.user.id)
    const auth = bearer(user.accessToken)

    await api().post('/api/content').set(auth).send(doc({ id: 'other' })).expect(403)
    await api().put(`/api/content/${item.id}`).set(auth).send(doc()).expect(403)
    await api().delete(`/api/content/${item.id}`).set(auth).expect(403)
    expect(await prisma.contentItem.count()).toBe(1)
  })
})

describe('POST /api/content', () => {
  it('the owner creates a document; slug, lang and title come from it', async () => {
    const owner = await asOwner()
    const res = await api().post('/api/content').set(bearer(owner.accessToken)).send(doc()).expect(201)
    expect(res.body).toMatchObject({
      slug: 'biomagneticPair',
      lang: 'es-ES',
      title: 'Par Biomagnético',
      formatVersion: 1,
      authorId: owner.user.id,
    })
    expect(res.body.data.formatVersion).toBe(1)
  })

  it('409 if the same id and language already exist; another language is fine', async () => {
    const owner = await asOwner()
    const auth = bearer(owner.accessToken)
    await api().post('/api/content').set(auth).send(doc()).expect(201)
    await api().post('/api/content').set(auth).send(doc()).expect(409)
    await api().post('/api/content').set(auth).send(doc({ lang: 'gl-ES' })).expect(201)
  })

  it('400 on an invalid body: bad type, image URL instead of a key', async () => {
    const owner = await asOwner()
    const auth = bearer(owner.accessToken)
    await api().post('/api/content').set(auth).send({ title: 'x' }).expect(400)
    await api().post('/api/content').set(auth).send(doc({ contents: [{ type: 'pill', name: 'x' }] })).expect(400)
    const url = { ...remedy(), images: ['https://lh3.googleusercontent.com/d/abc'] }
    await api().post('/api/content').set(auth).send(doc({ contents: [url] })).expect(400)
    expect(await prisma.contentItem.count()).toBe(0)
  })

  it('accepts a real-size document (over 100 KB)', async () => {
    const owner = await asOwner()
    const big = Array.from({ length: 400 }, (_, i) => ({ ...remedy(`R${i}`), description: 'x'.repeat(600) }))
    const res = await api()
      .post('/api/content')
      .set(bearer(owner.accessToken))
      .send(doc({ contents: big }))
      .expect(201)
    const full = await api().get(`/api/content/${res.body.id}`).set(bearer(owner.accessToken)).expect(200)
    expect(full.body.data.contents).toHaveLength(400)
  })
})

describe('PUT /api/content/:id', () => {
  it('replaces the document and refreshes the copied fields', async () => {
    const owner = await asOwner()
    const item = await createItem(owner.user.id)
    const res = await api()
      .put(`/api/content/${item.id}`)
      .set(bearer(owner.accessToken))
      .send(doc({ name: 'Par Biomagnético (rev.)', contents: [remedy('Nova')] }))
      .expect(200)
    expect(res.body).toMatchObject({ id: item.id, title: 'Par Biomagnético (rev.)' })
    expect(res.body.data.contents).toHaveLength(1)
    expect(res.body.data.contents[0].name).toBe('Nova')
  })

  it('404 on an unknown id, 409 when it would collide with another document', async () => {
    const owner = await asOwner()
    const auth = bearer(owner.accessToken)
    await createItem(owner.user.id, { id: 'bach' })
    const item = await createItem(owner.user.id)
    await api().put('/api/content/does-not-exist').set(auth).send(doc()).expect(404)
    await api().put(`/api/content/${item.id}`).set(auth).send(doc({ id: 'bach' })).expect(409)
  })
})

describe('DELETE /api/content/:id', () => {
  it('deletes the item, then 404', async () => {
    const owner = await asOwner()
    const item = await createItem(owner.user.id)
    const auth = bearer(owner.accessToken)
    await api().delete(`/api/content/${item.id}`).set(auth).expect(204)
    expect(await prisma.contentItem.count()).toBe(0)
    await api().delete(`/api/content/${item.id}`).set(auth).expect(404)
  })
})
