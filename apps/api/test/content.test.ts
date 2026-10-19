import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.ts'
import { api, login } from './helpers.ts'

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

// `owner@test.com` is the OWNER_EMAIL of the test environment (see vitest.config.ts).
const asOwner = () => login('owner@test.com')
const asUser = () => login('user@test.com')

const createItem = (authorId: string, data: { title?: string; description?: string; createdAt?: Date } = {}) =>
  prisma.contentItem.create({ data: { title: 'Titulo', description: 'desc', authorId, ...data } })

describe('authentication', () => {
  it('401 without token on every route', async () => {
    await api().get('/api/content').expect(401)
    await api().post('/api/content').send({ title: 'x' }).expect(401)
    await api().patch('/api/content/abc').send({ title: 'x' }).expect(401)
    await api().delete('/api/content/abc').expect(401)
  })
})

describe('GET /api/content', () => {
  it('a normal user can list', async () => {
    const user = await asUser()
    const res = await api().get('/api/content').set(bearer(user.accessToken)).expect(200)
    expect(res.body).toEqual([])
  })

  it('lists newest first', async () => {
    const owner = await asOwner()
    await createItem(owner.user.id, { title: 'old', createdAt: new Date('2026-01-01') })
    await createItem(owner.user.id, { title: 'new', createdAt: new Date('2026-06-01') })
    const res = await api().get('/api/content').set(bearer(owner.accessToken)).expect(200)
    expect(res.body.map((i: { title: string }) => i.title)).toEqual(['new', 'old'])
  })
})

describe('permissions (403 for a normal user)', () => {
  it('cannot create, edit or delete', async () => {
    const owner = await asOwner()
    const user = await asUser()
    const item = await createItem(owner.user.id)
    const auth = bearer(user.accessToken)

    await api().post('/api/content').set(auth).send({ title: 'x' }).expect(403)
    await api().patch(`/api/content/${item.id}`).set(auth).send({ title: 'x' }).expect(403)
    await api().delete(`/api/content/${item.id}`).set(auth).expect(403)
    expect(await prisma.contentItem.count()).toBe(1)
  })
})

describe('POST /api/content', () => {
  it('the owner creates an item with the default description', async () => {
    const owner = await asOwner()
    const res = await api().post('/api/content').set(bearer(owner.accessToken)).send({ title: 'Peli' }).expect(201)
    expect(res.body).toMatchObject({ title: 'Peli', description: '', authorId: owner.user.id })
  })

  it('rejects an invalid body', async () => {
    const owner = await asOwner()
    await api().post('/api/content').set(bearer(owner.accessToken)).send({ title: '' }).expect(400)
  })
})

describe('PATCH /api/content/:id', () => {
  it('updates only the given fields', async () => {
    const owner = await asOwner()
    const item = await createItem(owner.user.id, { title: 'a', description: 'keep me' })
    const res = await api()
      .patch(`/api/content/${item.id}`)
      .set(bearer(owner.accessToken))
      .send({ title: 'b' })
      .expect(200)
    expect(res.body).toMatchObject({ title: 'b', description: 'keep me' })
  })

  it('400 on an empty update, 404 on an unknown id', async () => {
    const owner = await asOwner()
    const item = await createItem(owner.user.id)
    const auth = bearer(owner.accessToken)
    await api().patch(`/api/content/${item.id}`).set(auth).send({}).expect(400)
    await api().patch('/api/content/does-not-exist').set(auth).send({ title: 'x' }).expect(404)
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
