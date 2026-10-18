import type { AuthUser, Session } from '@kinotest/shared'
import { env } from '../env.ts'
import { mailer } from '../mail/index.ts'
import { authRepository as repo } from './repository.ts'
import { hashToken, newToken, signAccess } from './tokens.ts'

const LINK_TTL_MS = 15 * 60 * 1000
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000
const MAX_LINKS_PER_WINDOW = 3

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const toAuthUser = (u: { id: string; email: string; role: 'owner' | 'user' }): AuthUser => ({
  id: u.id,
  email: u.email,
  role: u.role,
})

async function issueSession(user: AuthUser): Promise<Session> {
  const refreshToken = newToken()
  await repo.createRefreshToken({
    tokenHash: hashToken(refreshToken),
    userId: user.id,
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  })
  return { accessToken: signAccess(user), refreshToken, user }
}

export const authService = {
  /** Always resolves the same way whether or not the email exists, and never creates users. */
  async requestLink(email: string): Promise<void> {
    const now = Date.now()
    const recent = await repo.countRecentLoginTokens(email, new Date(now - LINK_TTL_MS))
    if (recent >= MAX_LINKS_PER_WINDOW) return // silently ignored: anti-abuse

    const token = newToken()
    await repo.createLoginToken({
      tokenHash: hashToken(token),
      email,
      expiresAt: new Date(now + LINK_TTL_MS),
    })
    const url = `${env.APP_URL}/auth/verify?token=${token}`
    await mailer.send({
      to: email,
      subject: 'O teu enlace para entrar en Kinotest',
      text: `Entra en Kinotest con este enlace (caduca en 15 minutos):\n${url}\n\nSe non o pediches ti, ignora este correo.`,
      html: `<p>Entra en Kinotest con este enlace (caduca en 15 minutos):</p><p><a href="${url}">Entrar en Kinotest</a></p><p>Se non o pediches ti, ignora este correo.</p>`,
    })
  },

  async verifyLink(token: string): Promise<Session> {
    const email = await repo.consumeLoginToken(hashToken(token), new Date())
    if (!email) throw new AuthError(401, 'Enlace inválido ou caducado')
    const isOwner = !!env.OWNER_EMAIL && email === env.OWNER_EMAIL.toLowerCase()
    const user = await repo.findOrCreateUser(email, isOwner ? 'owner' : 'user')
    return issueSession(toAuthUser(user))
  },

  async refresh(refreshToken: string): Promise<Session> {
    const userId = await repo.consumeRefreshToken(hashToken(refreshToken), new Date())
    const user = userId ? await repo.findUserById(userId) : null
    if (!user) throw new AuthError(401, 'Sesión inválida')
    return issueSession(toAuthUser(user))
  },

  async logout(refreshToken: string): Promise<void> {
    await repo.revokeRefreshToken(hashToken(refreshToken))
  },

  async me(userId: string): Promise<AuthUser> {
    const user = await repo.findUserById(userId)
    if (!user) throw new AuthError(401, 'Sesión inválida')
    return toAuthUser(user)
  },
}
