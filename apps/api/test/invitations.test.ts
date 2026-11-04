import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.ts'
import { outbox } from '../src/mail/memory.ts'
import { api, login } from './helpers.ts'

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const asOwner = () => login('owner@test.com')

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

const mailsTo = (email: string) => outbox.filter((m) => m.to === email)
const tokenOf = (email: string) => /token=([\w-]+)/.exec(mailsTo(email).at(-1)?.text ?? '')?.[1]

describe('POST /api/assignments with emails', () => {
  it('creates unconfirmed accounts, assigns and sends one invitation per new email', async () => {
    const owner = await asOwner()
    const item = await makeItem(owner.user.id, 'a')

    const res = await api()
      .post('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ emails: ['New@Test.com', 'new@test.com ', 'other@test.com'], contentItemIds: [item.id] })
      .expect(201)

    expect(res.body).toMatchObject({ created: 2, skipped: 0, inviteFailed: [] })
    expect([...res.body.invited].sort()).toEqual(['new@test.com', 'other@test.com'])
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new@test.com' } })
    expect(user).toMatchObject({ role: 'user', confirmedAt: null })
    expect(mailsTo('new@test.com')).toHaveLength(1)
    expect(mailsTo('new@test.com')[0].subject).toMatch(/convid/i)
    expect(tokenOf('new@test.com')).toBeTruthy()
  })

  it('verifying the invitation link confirms the account and shows the therapy', async () => {
    const owner = await asOwner()
    const item = await makeItem(owner.user.id, 'a')
    await api()
      .post('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ emails: ['new@test.com'], contentItemIds: [item.id] })
      .expect(201)

    const session = await api().post('/api/auth/verify').send({ token: tokenOf('new@test.com') }).expect(200)
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new@test.com' } })
    expect(user.confirmedAt).not.toBeNull()
    expect(session.body.user.id).toBe(user.id)

    const mine = await api().get('/api/me/therapies').set(bearer(session.body.accessToken)).expect(200)
    expect(mine.body.map((t: { id: string }) => t.id)).toEqual([item.id])
  })

  it('does not invite existing accounts, confirmed or not, and does not duplicate them', async () => {
    const owner = await asOwner()
    const confirmed = await login('t1@test.com')
    await prisma.user.create({ data: { email: 'pending@test.com', confirmedAt: null } })
    const item = await makeItem(owner.user.id, 'a')

    const res = await api()
      .post('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ emails: ['t1@test.com', 'pending@test.com'], contentItemIds: [item.id] })
      .expect(201)

    expect(res.body).toMatchObject({ created: 2, invited: [], inviteFailed: [] })
    expect(mailsTo('pending@test.com')).toHaveLength(0)
    expect(await prisma.user.count({ where: { email: { in: ['t1@test.com', 'pending@test.com'] } } })).toBe(2)
    expect(await prisma.therapyAssignment.count({ where: { userId: confirmed.user.id } })).toBe(1)
  })

  it('mixes userIds and emails; an unknown userId creates nothing (404)', async () => {
    const owner = await asOwner()
    const t1 = await login('t1@test.com')
    const item = await makeItem(owner.user.id, 'a')

    const ok = await api()
      .post('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ userIds: [t1.user.id], emails: ['new@test.com'], contentItemIds: [item.id] })
      .expect(201)
    expect(ok.body.created).toBe(2)

    await api()
      .post('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ userIds: ['no-existe'], emails: ['ghost@test.com'], contentItemIds: [item.id] })
      .expect(404)
    expect(await prisma.user.count({ where: { email: 'ghost@test.com' } })).toBe(0)
  })

  it('400 without therapists or emails, or with an invalid email', async () => {
    const owner = await asOwner()
    const item = await makeItem(owner.user.id, 'a')
    const post = (body: Record<string, unknown>) =>
      api().post('/api/assignments').set(bearer(owner.accessToken)).send(body)
    await post({ contentItemIds: [item.id] }).expect(400)
    await post({ emails: ['non-e-un-email'], contentItemIds: [item.id] }).expect(400)
  })

  it('emails count towards the combination limit', async () => {
    const owner = await asOwner()
    const item = await makeItem(owner.user.id, 'a')
    const emails = Array.from({ length: 200 }, (_, i) => `u${i}@test.com`)
    const items = [item.id, 'b', 'c', 'd', 'e', 'f']
    await api()
      .post('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ emails, contentItemIds: items })
      .expect(400)
  })
})

describe('POST /api/assignments/invitations', () => {
  it('resends only to unconfirmed accounts', async () => {
    const owner = await asOwner()
    const t1 = await login('t1@test.com')
    const pending = await prisma.user.create({ data: { email: 'pending@test.com', confirmedAt: null } })

    const res = await api()
      .post('/api/assignments/invitations')
      .set(bearer(owner.accessToken))
      .send({ userIds: [t1.user.id, pending.id] })
      .expect(200)

    expect(res.body).toEqual({ invited: ['pending@test.com'], failed: [] })
    expect(mailsTo('pending@test.com')).toHaveLength(1)
    expect(tokenOf('pending@test.com')).toBeTruthy()
  })

  it('403 for a normal user', async () => {
    const user = await login('t1@test.com')
    await api()
      .post('/api/assignments/invitations')
      .set(bearer(user.accessToken))
      .send({ userIds: ['x'] })
      .expect(403)
  })
})
