import { prisma } from '../db.ts'

export const authRepository = {
  countRecentLoginTokens: (email: string, since: Date) =>
    prisma.loginToken.count({ where: { email, createdAt: { gte: since } } }),

  createLoginToken: (data: { tokenHash: string; email: string; expiresAt: Date }) =>
    prisma.loginToken.create({ data }),

  /** Marks the token as used atomically. Returns its email, or null if invalid/expired/used. */
  async consumeLoginToken(tokenHash: string, now: Date): Promise<string | null> {
    const token = await prisma.loginToken.findUnique({ where: { tokenHash } })
    if (!token) return null
    const { count } = await prisma.loginToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    return count === 1 ? token.email : null
  },

  findOrCreateUser: (email: string, role: 'owner' | 'user') =>
    prisma.user.upsert({ where: { email }, update: {}, create: { email, role } }),

  findUserById: (id: string) => prisma.user.findUnique({ where: { id } }),

  createRefreshToken: (data: { tokenHash: string; userId: string; expiresAt: Date }) =>
    prisma.refreshToken.create({ data }),

  /** Rotation: revokes the token and returns its userId. Reusing a revoked token revokes the whole family. */
  async consumeRefreshToken(tokenHash: string, now: Date): Promise<string | null> {
    const token = await prisma.refreshToken.findUnique({ where: { tokenHash } })
    if (!token) return null
    if (token.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: token.userId, revokedAt: null },
        data: { revokedAt: now },
      })
      return null
    }
    const { count } = await prisma.refreshToken.updateMany({
      where: { id: token.id, revokedAt: null, expiresAt: { gt: now } },
      data: { revokedAt: now },
    })
    return count === 1 ? token.userId : null
  },

  revokeRefreshToken: (tokenHash: string) =>
    prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
}
