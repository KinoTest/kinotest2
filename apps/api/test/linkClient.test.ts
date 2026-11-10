import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.ts'
import { outbox } from '../src/mail/memory.ts'
import { api, login } from './helpers.ts'

// vitest.config.ts: APP_URL = therapist app, ADMIN_URL = owner's panel (different on purpose).
const APP = 'http://localhost:5173'
const ADMIN = 'http://localhost:5174'

const bearer = (token: string) => ({ Authorization: `Bearer ${token}` })
const lastMailTo = (email: string) => outbox.filter((m) => m.to === email).at(-1)
const linkIn = (text: string | undefined) => /\S+\/auth\/verify\?token=[\w-]+/.exec(text ?? '')?.[0] ?? ''
const expectLinkTo = (email: string, base: string) => {
  const link = linkIn(lastMailTo(email)?.text)
  expect(link.startsWith(`${base}/auth/verify?token=`), `link was: ${link}`).toBe(true)
}

describe('POST /api/auth/request-link: where the link points', () => {
  it('points to the admin panel when the client is not given (default)', async () => {
    await api().post('/api/auth/request-link').send({ email: 'a@x.com' }).expect(202)
    expectLinkTo('a@x.com', ADMIN)
  })

  it('points to the admin panel for client "admin"', async () => {
    await api().post('/api/auth/request-link').send({ email: 'a@x.com', client: 'admin' }).expect(202)
    expectLinkTo('a@x.com', ADMIN)
  })

  it('points to the therapist app for client "app"', async () => {
    await api().post('/api/auth/request-link').send({ email: 'a@x.com', client: 'app' }).expect(202)
    expectLinkTo('a@x.com', APP)
  })

  it('uses the same address in the HTML part of the email', async () => {
    await api().post('/api/auth/request-link').send({ email: 'a@x.com', client: 'app' }).expect(202)
    const link = linkIn(lastMailTo('a@x.com')?.text)
    expect(lastMailTo('a@x.com')?.html).toContain(`href="${link}"`)
  })

  it.each(['evil', 'APP', '', 'https://evil.example'])('rejects the unknown client %j and sends nothing', async (client) => {
    await api().post('/api/auth/request-link').send({ email: 'a@x.com', client }).expect(400)
    expect(outbox).toHaveLength(0)
  })

  it('a link requested by the app verifies like any other', async () => {
    await api().post('/api/auth/request-link').send({ email: 'a@x.com', client: 'app' }).expect(202)
    const token = /token=([\w-]+)/.exec(lastMailTo('a@x.com')?.text ?? '')?.[1]
    const res = await api().post('/api/auth/verify').send({ token }).expect(200)
    expect(res.body.user).toMatchObject({ email: 'a@x.com', role: 'user' })
  })
})

describe('invitations always point to the therapist app', () => {
  const makeItem = (authorId: string) =>
    prisma.contentItem.create({
      data: {
        contentId: 'a',
        lang: 'es-ES',
        title: 'Terapia a',
        data: { id: 'a', lang: 'es-ES', formatVersion: 1, type: 'catalog', name: 'Terapia a', contents: [] } as never,
        authorId,
      },
    })

  it('the invitation sent when assigning to a new email points to the app', async () => {
    const owner = await login('owner@test.com')
    const item = await makeItem(owner.user.id)
    await api()
      .post('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ emails: ['new@test.com'], contentItemIds: [item.id] })
      .expect(201)
    expectLinkTo('new@test.com', APP)
  })

  it('a resent invitation points to the app too', async () => {
    const owner = await login('owner@test.com')
    const item = await makeItem(owner.user.id)
    await api()
      .post('/api/assignments')
      .set(bearer(owner.accessToken))
      .send({ emails: ['new@test.com'], contentItemIds: [item.id] })
      .expect(201)
    const user = await prisma.user.findUniqueOrThrow({ where: { email: 'new@test.com' } })
    const before = outbox.length

    await api()
      .post('/api/assignments/invitations')
      .set(bearer(owner.accessToken))
      .send({ userIds: [user.id] })
      .expect(200)
    expect(outbox.length).toBe(before + 1)
    expectLinkTo('new@test.com', APP)
  })
})
