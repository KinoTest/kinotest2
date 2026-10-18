import { describe, expect, it } from 'vitest'
import { authRepository } from '../src/auth/repository.ts'
import { prisma } from '../src/db.ts'

const HOUR = 60 * 60 * 1000
const ago = (ms: number) => new Date(Date.now() - ms)
const ahead = (ms: number) => new Date(Date.now() + ms)

describe('deleteExpiredTokens', () => {
  it('deletes only tokens expired before the cutoff', async () => {
    const email = 'a@x.com'
    const user = await prisma.user.create({ data: { email } })

    await prisma.loginToken.createMany({
      data: [
        { tokenHash: 'l-old', email, expiresAt: ago(48 * HOUR) },
        { tokenHash: 'l-grace', email, expiresAt: ago(1 * HOUR) }, // expired, inside grace period
        { tokenHash: 'l-valid', email, expiresAt: ahead(HOUR) },
      ],
    })
    await prisma.refreshToken.createMany({
      data: [
        { tokenHash: 'r-old', userId: user.id, expiresAt: ago(48 * HOUR) },
        { tokenHash: 'r-valid', userId: user.id, expiresAt: ahead(HOUR) },
        // revoked but not expired: must stay, it is needed for reuse detection
        { tokenHash: 'r-revoked', userId: user.id, expiresAt: ahead(HOUR), revokedAt: new Date() },
      ],
    })

    const result = await authRepository.deleteExpiredTokens(ago(24 * HOUR))

    expect(result).toEqual({ login: 1, refresh: 1 })
    const login = await prisma.loginToken.findMany({ select: { tokenHash: true } })
    const refresh = await prisma.refreshToken.findMany({ select: { tokenHash: true } })
    expect(login.map((t) => t.tokenHash).sort()).toEqual(['l-grace', 'l-valid'])
    expect(refresh.map((t) => t.tokenHash).sort()).toEqual(['r-revoked', 'r-valid'])
  })

  it('does nothing when there is nothing to delete', async () => {
    expect(await authRepository.deleteExpiredTokens(ago(24 * HOUR))).toEqual({ login: 0, refresh: 0 })
  })
})