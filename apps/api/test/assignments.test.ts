import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.ts'
import { api, login } from './helpers.ts'

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })

// `owner@test.com` is the OWNER_EMAIL of the test environment (see vitest.config.ts).
const asOwner = () => login('owner@test.com')
const asTherapist = (n = 1) => login(`t${n}@test.com`)

const makeItem = (authorId: string, contentId: string, lang = 'es-ES') =>
  prisma.contentItem.create({
    data: {
      contentId,
      lang,
      title: `Terapia ${contentId}`,
      data: { id: contentId, lang, formatVersion: 1, type: 'catalog', name: `Terapia ${contentId}`, contents: [] } as never,
      authorId,
    },
  })

const assign = (token: string, body: Record<string, unknown>) =>
  api().post('/api/assignments').set(bearer(token)).send(body)

const day = 24 * 60 * 60 * 1000
const inDays = (n: number) => new Date(Date.now() + n * day)

describe('access control', () => {
  const routes = [
    ['get', '/api/assignments?userId=x'],
    ['post', '/api/assignments'],
    ['delete', '/api/assignments'],
    ['patch', '/api/assignments/x'],
    ['get', '/api/users'],
  ] as const

  it('401 without token on every route', async () => {
    for (const [method, url] of routes) await api()[method](url).expect(401)
    await api().get('/api/me/therapies').expect(401)
    await api().get('/api/me/therapies/x').expect(401)
  })

  it('403 for a normal user on the management routes', async () => {
    const user = await asTherapist()
    for (const [method, url] of routes) await api()[method](url).set(bearer(user.accessToken)).expect(403)
  })
})

describe('GET /api/users', () => {
  it('lists users with their assignment count; ?search= filters by email', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    await asTherapist(2)
    const item = await makeItem(owner.user.id, 'a')
    await assign(owner.accessToken, { userIds: [t1.user.id], contentItemIds: [item.id] }).expect(201)

    const all = await api().get('/api/users').set(bearer(owner.accessToken)).expect(200)
    expect(all.body).toHaveLength(3)
    const mine = all.body.find((u: { email: string }) => u.email === 't1@test.com')
    expect(mine).toMatchObject({ id: t1.user.id, role: 'user', assignmentCount: 1 })

    const found = await api().get('/api/users?search=T1@').set(bearer(owner.accessToken)).expect(200)
    expect(found.body.map((u: { email: string }) => u.email)).toEqual(['t1@test.com'])
  })
})

describe('GET /api/users/:id', () => {
  it('returns one user, 404 if unknown', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    const auth = bearer(owner.accessToken)
    const res = await api().get(`/api/users/${t1.user.id}`).set(auth).expect(200)
    expect(res.body).toMatchObject({ id: t1.user.id, email: 't1@test.com', assignmentCount: 0 })
    await api().get(`/api/users/${randomUUID()}`).set(auth).expect(404)
    await api().get(`/api/users/${t1.user.id}`).set(bearer(t1.accessToken)).expect(403)
  })
})

describe('POST /api/assignments', () => {
  it('assigns every therapist x therapy; existing pairs are skipped, not duplicated', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    const t2 = await asTherapist(2)
    const a = await makeItem(owner.user.id, 'a')
    const b = await makeItem(owner.user.id, 'b')
    const body = { userIds: [t1.user.id, t2.user.id], contentItemIds: [a.id, b.id], note: 'Curso 2026', amount: 49.9 }

    const first = await assign(owner.accessToken, body).expect(201)
    expect(first.body).toMatchObject({ created: 4, skipped: 0 })
    const again = await assign(owner.accessToken, body).expect(201)
    expect(again.body).toMatchObject({ created: 0, skipped: 4 })
    expect(await prisma.therapyAssignment.count()).toBe(4)

    const row = await prisma.therapyAssignment.findFirstOrThrow()
    expect(row.assignedById).toBe(owner.user.id)
    expect(row.note).toBe('Curso 2026')
    expect(row.amount?.toNumber()).toBe(49.9)
  })

  it('repeated ids in the request count once', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    const a = await makeItem(owner.user.id, 'a')
    const res = await assign(owner.accessToken, { userIds: [t1.user.id, t1.user.id], contentItemIds: [a.id] }).expect(201)
    expect(res.body).toMatchObject({ created: 1, skipped: 0 })
  })

  it('404 if a therapist or a therapy does not exist, and nothing is created', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    const a = await makeItem(owner.user.id, 'a')
    await assign(owner.accessToken, { userIds: [t1.user.id, randomUUID()], contentItemIds: [a.id] }).expect(404)
    await assign(owner.accessToken, { userIds: [t1.user.id], contentItemIds: [randomUUID()] }).expect(404)
    expect(await prisma.therapyAssignment.count()).toBe(0)
  })

  it('400 on an invalid body', async () => {
    const owner = await asOwner()
    const ok = { userIds: ['u'], contentItemIds: ['c'] }
    await assign(owner.accessToken, { ...ok, userIds: [] }).expect(400)
    await assign(owner.accessToken, { ...ok, contentItemIds: [] }).expect(400)
    await assign(owner.accessToken, { ...ok, amount: 1.234 }).expect(400)
    await assign(owner.accessToken, { ...ok, amount: -1 }).expect(400)
    await assign(owner.accessToken, { ...ok, expiresAt: 'ayer' }).expect(400)
    await assign(owner.accessToken, { ...ok, note: 'x'.repeat(501) }).expect(400)
    const many = Array.from({ length: 40 }, (_, i) => `id${i}`)
    await assign(owner.accessToken, { userIds: many, contentItemIds: many.concat(many).slice(0, 26) }).expect(400)
  })
})

describe('GET /api/assignments', () => {
  it('lists by therapist or by therapy, with the data the panel shows', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    const t2 = await asTherapist(2)
    const a = await makeItem(owner.user.id, 'a')
    const b = await makeItem(owner.user.id, 'b')
    await assign(owner.accessToken, { userIds: [t1.user.id], contentItemIds: [a.id, b.id], amount: 20 }).expect(201)
    await assign(owner.accessToken, { userIds: [t2.user.id], contentItemIds: [a.id] }).expect(201)
    const auth = bearer(owner.accessToken)

    const byUser = await api().get(`/api/assignments?userId=${t1.user.id}`).set(auth).expect(200)
    expect(byUser.body).toHaveLength(2)
    expect(byUser.body[0]).toMatchObject({
      userId: t1.user.id,
      amount: 20,
      note: null,
      expiresAt: null,
      user: { email: 't1@test.com' },
    })
    expect(byUser.body[0].contentItem).toMatchObject({ lang: 'es-ES' })

    const byItem = await api().get(`/api/assignments?contentItemId=${a.id}`).set(auth).expect(200)
    expect(byItem.body.map((r: { user: { email: string } }) => r.user.email).sort()).toEqual(['t1@test.com', 't2@test.com'])
  })

  it('400 without a filter', async () => {
    const owner = await asOwner()
    await api().get('/api/assignments').set(bearer(owner.accessToken)).expect(400)
  })
})

describe('PATCH /api/assignments/:id', () => {
  it('changes expiry, note and amount; null clears them', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    const a = await makeItem(owner.user.id, 'a')
    const row = await prisma.therapyAssignment.create({
      data: { userId: t1.user.id, contentItemId: a.id, assignedById: owner.user.id },
    })
    const auth = bearer(owner.accessToken)
    const expiresAt = inDays(30).toISOString()

    const set = await api().patch(`/api/assignments/${row.id}`).set(auth).send({ expiresAt, note: 'Novo', amount: 10.5 }).expect(200)
    expect(set.body).toMatchObject({ id: row.id, expiresAt, note: 'Novo', amount: 10.5 })

    const cleared = await api().patch(`/api/assignments/${row.id}`).set(auth).send({ expiresAt: null, note: null, amount: null }).expect(200)
    expect(cleared.body).toMatchObject({ expiresAt: null, note: null, amount: null })
  })

  it('404 on an unknown id, 400 on an empty body', async () => {
    const owner = await asOwner()
    const auth = bearer(owner.accessToken)
    await api().patch(`/api/assignments/${randomUUID()}`).set(auth).send({ note: 'x' }).expect(404)
    await api().patch(`/api/assignments/${randomUUID()}`).set(auth).send({}).expect(400)
  })
})

describe('DELETE /api/assignments', () => {
  it('unassigns every therapist x therapy and reports how many', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    const t2 = await asTherapist(2)
    const a = await makeItem(owner.user.id, 'a')
    const b = await makeItem(owner.user.id, 'b')
    await assign(owner.accessToken, { userIds: [t1.user.id, t2.user.id], contentItemIds: [a.id, b.id] }).expect(201)

    const res = await api()
      .delete('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ userIds: [t1.user.id], contentItemIds: [a.id, b.id] })
      .expect(200)
    expect(res.body).toEqual({ deleted: 2 })
    expect(await prisma.therapyAssignment.count()).toBe(2)
  })
})

describe('GET /api/me/therapies', () => {
  it('a therapist only sees what is assigned and not expired, without note or amount', async () => {
    const owner = await asOwner()
    const t1 = await asTherapist(1)
    const t2 = await asTherapist(2)
    const active = await makeItem(owner.user.id, 'active')
    const future = await makeItem(owner.user.id, 'future')
    const expired = await makeItem(owner.user.id, 'expired')
    const unassigned = await makeItem(owner.user.id, 'unassigned')
    const base = { userId: t1.user.id, assignedById: owner.user.id }
    await prisma.therapyAssignment.createMany({
      data: [
        { ...base, contentItemId: active.id, note: 'privada', amount: 5 },
        { ...base, contentItemId: future.id, expiresAt: inDays(10) },
        { ...base, contentItemId: expired.id, expiresAt: inDays(-1) },
      ],
    })
    const auth = bearer(t1.accessToken)

    const list = await api().get('/api/me/therapies').set(auth).expect(200)
    expect(list.body.map((i: { contentId: string }) => i.contentId).sort()).toEqual(['active', 'future'])
    expect(list.body[0]).toMatchObject({ lang: 'es-ES', formatVersion: 1 })
    for (const item of list.body) {
      expect(item).not.toHaveProperty('note')
      expect(item).not.toHaveProperty('amount')
      expect(item).not.toHaveProperty('data')
    }

    const one = await api().get(`/api/me/therapies/${active.id}`).set(auth).expect(200)
    expect(one.body.data.name).toBe('Terapia active')
    expect(one.body).not.toHaveProperty('authorId')
    await api().get(`/api/me/therapies/${future.id}`).set(auth).expect(200)

    await api().get(`/api/me/therapies/${expired.id}`).set(auth).expect(404)
    await api().get(`/api/me/therapies/${unassigned.id}`).set(auth).expect(404)
    await api().get(`/api/me/therapies/${active.id}`).set(bearer(t2.accessToken)).expect(404)
    const none = await api().get('/api/me/therapies').set(bearer(t2.accessToken)).expect(200)
    expect(none.body).toEqual([])
  })
})
