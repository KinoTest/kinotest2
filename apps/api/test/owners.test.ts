import { afterEach, describe, expect, it } from 'vitest'
import { roleForEmail } from '../src/auth/service.ts'
import { prisma } from '../src/db.ts'
import { env } from '../src/env.ts'
import { login } from './helpers.ts'

// `owner@test.com` is OWNER_EMAIL (single) in the test environment; see vitest.config.ts.
const original = { list: env.OWNER_EMAILS, single: env.OWNER_EMAIL }
afterEach(() => {
  env.OWNER_EMAILS = original.list
  env.OWNER_EMAIL = original.single
})

const roleOf = async (email: string) => (await prisma.user.findUniqueOrThrow({ where: { email } })).role

describe('owner emails', () => {
  it('OWNER_EMAILS takes a list (spaces, uppercase, trailing comma) and OWNER_EMAIL keeps working', () => {
    env.OWNER_EMAILS = ' A@test.com, b@test.com ,'
    expect(roleForEmail('a@test.com')).toBe('owner')
    expect(roleForEmail('b@test.com')).toBe('owner')
    expect(roleForEmail('owner@test.com')).toBe('owner')
    expect(roleForEmail('c@test.com')).toBe('user')
  })

  it('a second owner is created as owner on first login', async () => {
    env.OWNER_EMAILS = 'second@test.com'
    await login('second@test.com')
    expect(await roleOf('second@test.com')).toBe('owner')
  })

  it('an existing user added to the list is promoted on the next login', async () => {
    await login('late@test.com')
    expect(await roleOf('late@test.com')).toBe('user')
    env.OWNER_EMAILS = 'late@test.com'
    await login('late@test.com')
    expect(await roleOf('late@test.com')).toBe('owner')
  })

  it('removing an email from the list does not demote the account', async () => {
    env.OWNER_EMAILS = 'second@test.com'
    await login('second@test.com')
    env.OWNER_EMAILS = undefined
    await login('second@test.com')
    expect(await roleOf('second@test.com')).toBe('owner')
  })
})
