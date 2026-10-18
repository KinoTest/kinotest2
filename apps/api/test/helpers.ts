import type { Session } from '@kinotest/shared'
import request from 'supertest'
import { app } from '../src/app.ts'
import { outbox } from '../src/mail/memory.ts'

export const api = () => request(app)

/** Requests a magic link and returns the raw token found in the email. */
export async function requestToken(email: string): Promise<string> {
  await api().post('/api/auth/request-link').send({ email }).expect(202)
  const match = /token=([\w-]+)/.exec(outbox.at(-1)?.text ?? '')
  if (!match) throw new Error('No magic link found in outbox')
  return match[1]
}

/** Full login flow: request link + verify. */
export async function login(email: string): Promise<Session> {
  const token = await requestToken(email)
  const res = await api().post('/api/auth/verify').send({ token }).expect(200)
  return res.body as Session
}
