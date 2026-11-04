import type { AuthUser, Session } from '@kinotest/shared'
import { env } from '../env.ts'
import { mailer } from '../mail/index.ts'
import { authRepository as repo } from './repository.ts'
import { hashToken, newToken, signAccess } from './tokens.ts'

const LINK_TTL_MS = 15 * 60 * 1000
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_LINKS_PER_WINDOW = 3

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** The OWNER_EMAIL account is the owner; everybody else is a user. */
export const roleForEmail = (email: string): 'owner' | 'user' =>
  !!env.OWNER_EMAIL && email === env.OWNER_EMAIL.toLowerCase() ? 'owner' : 'user'

async function createLoginLink(email: string, ttlMs: number): Promise<string> {
  const token = newToken()
  await repo.createLoginToken({
    tokenHash: hashToken(token),
    email,
    expiresAt: new Date(Date.now() + ttlMs),
  })
  return `${env.APP_URL}/auth/verify?token=${token}`
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
    const recent = await repo.countRecentLoginTokens(email, new Date(Date.now() - LINK_TTL_MS))
    if (recent >= MAX_LINKS_PER_WINDOW) return // silently ignored: anti-abuse

    const url = await createLoginLink(email, LINK_TTL_MS)
    await mailer.send({
      to: email,
      subject: 'O teu enlace para entrar en Kinotest',
      text: `Entra en Kinotest con este enlace (caduca en 15 minutos):\n${url}\n\nSe non o pediches ti, ignora este correo.`,
      html: `<p>Entra en Kinotest con este enlace (caduca en 15 minutos):</p><p><a href="${url}">Entrar en Kinotest</a></p><p>Se non o pediches ti, ignora este correo.</p>`,
    })
  },

  /** Invitation sent when the owner assigns a therapy to an email: same magic link, valid for 7 days. */
  async sendInvitation(email: string): Promise<void> {
    const url = await createLoginLink(email, INVITE_TTL_MS)
    await mailer.send({
      to: email,
      subject: 'Convidáronte a usar Kinotest',
      text: `Convidáronte a usar Kinotest e asignáronche terapias.\n\nEntra con este enlace (caduca en 7 días):\n${url}\n\nSe non esperabas este convite, ignora este correo.`,
      html: `<p>Convidáronte a usar Kinotest e asignáronche terapias.</p><p><a href="${url}">Entrar en Kinotest</a> (o enlace caduca en 7 días)</p><p>Se non esperabas este convite, ignora este correo.</p>`,
    })
  },

  async verifyLink(token: string): Promise<Session> {
    const email = await repo.consumeLoginToken(hashToken(token), new Date())
    if (!email) throw new AuthError(401, 'Enlace inválido ou caducado')
    const user = await repo.findOrCreateUser(email, roleForEmail(email))
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
