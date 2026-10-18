import { describe, expect, it } from 'vitest'
import { prisma } from '../src/db.ts'
import { outbox } from '../src/mail/memory.ts'
import { api, login, requestToken } from './helpers.ts'

describe('POST /api/auth/request-link', () => {
  it('sends an email and does not create the user', async () => {
    await api().post('/api/auth/request-link').send({ email: 'a@x.com' }).expect(202)
    expect(outbox).toHaveLength(1)
    expect(outbox[0].to).toBe('a@x.com')
    expect(await prisma.user.count()).toBe(0)
  })

  it('normalises the email (trim + lowercase)', async () => {
    await api().post('/api/auth/request-link').send({ email: '  A@X.com ' }).expect(202)
    expect(outbox[0].to).toBe('a@x.com')
  })

  it('rejects an invalid email', async () => {
    await api().post('/api/auth/request-link').send({ email: 'nope' }).expect(400)
    expect(outbox).toHaveLength(0)
  })

  it('stops sending after 3 links in the window, but still answers 202', async () => {
    for (let i = 0; i < 4; i++) {
      await api().post('/api/auth/request-link').send({ email: 'a@x.com' }).expect(202)
    }
    expect(outbox).toHaveLength(3)
  })
})

describe('POST /api/auth/verify', () => {
  it('creates the user as `user` and returns a session', async () => {
    const session = await login('a@x.com')
    expect(session.user).toMatchObject({ email: 'a@x.com', role: 'user' })
    expect(session.accessToken).toBeTruthy()
    expect(session.refreshToken).toBeTruthy()
  })

  it('makes OWNER_EMAIL an owner', async () => {
    const session = await login('owner@test.com')
    expect(session.user.role).toBe('owner')
  })

  it('does not duplicate the user on a second login', async () => {
    await login('a@x.com')
    await login('a@x.com')
    expect(await prisma.user.count()).toBe(1)
  })

  it('a link only works once', async () => {
    const token = await requestToken('a@x.com')
    await api().post('/api/auth/verify').send({ token }).expect(200)
    await api().post('/api/auth/verify').send({ token }).expect(401)
  })

  it('an expired link is rejected', async () => {
    const token = await requestToken('a@x.com')
    await prisma.loginToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })
    await api().post('/api/auth/verify').send({ token }).expect(401)
  })

  it('an unknown token is rejected', async () => {
    await api().post('/api/auth/verify').send({ token: 'x'.repeat(43) }).expect(401)
  })

  it('stores only the hash, never the raw token', async () => {
    const token = await requestToken('a@x.com')
    const row = await prisma.loginToken.findFirstOrThrow()
    expect(row.tokenHash).not.toBe(token)
  })
})

describe('POST /api/auth/refresh', () => {
  it('rotates the refresh token', async () => {
    const s1 = await login('a@x.com')
    const res = await api().post('/api/auth/refresh').send({ refreshToken: s1.refreshToken }).expect(200)
    expect(res.body.refreshToken).not.toBe(s1.refreshToken)
    await api().post('/api/auth/refresh').send({ refreshToken: s1.refreshToken }).expect(401)
  })

  it('reusing a revoked token revokes the whole family', async () => {
    const s1 = await login('a@x.com')
    const s2 = (await api().post('/api/auth/refresh').send({ refreshToken: s1.refreshToken }).expect(200)).body
    await api().post('/api/auth/refresh').send({ refreshToken: s1.refreshToken }).expect(401) // reuse
    await api().post('/api/auth/refresh').send({ refreshToken: s2.refreshToken }).expect(401) // family dead
  })

  it('an expired refresh token is rejected', async () => {
    const s = await login('a@x.com')
    await prisma.refreshToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } })
    await api().post('/api/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('revokes the refresh token', async () => {
    const s = await login('a@x.com')
    await api().post('/api/auth/logout').send({ refreshToken: s.refreshToken }).expect(204)
    await api().post('/api/auth/refresh').send({ refreshToken: s.refreshToken }).expect(401)
  })
})

describe('GET /api/auth/me', () => {
  it('returns the user with a valid access token', async () => {
    const s = await login('a@x.com')
    const res = await api().get('/api/auth/me').set('Authorization', `Bearer ${s.accessToken}`).expect(200)
    expect(res.body).toMatchObject({ email: 'a@x.com', role: 'user' })
  })

  it('401 without token', async () => {
    await api().get('/api/auth/me').expect(401)
  })

  it('401 with a tampered token', async () => {
    const s = await login('a@x.com')
    await api().get('/api/auth/me').set('Authorization', `Bearer ${s.accessToken}x`).expect(401)
  })
})
