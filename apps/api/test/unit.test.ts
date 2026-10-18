import { can, rolePermissions } from '@kinotest/shared'
import jwt from 'jsonwebtoken'
import { describe, expect, it } from 'vitest'
import { hashToken, newToken, signAccess, verifyAccess } from '../src/auth/tokens.ts'

describe('roles', () => {
  it('user can read but not manage', () => {
    expect(can('user', 'content:read')).toBe(true)
    expect(can('user', 'content:manage')).toBe(false)
    expect(can('user', 'users:manage')).toBe(false)
  })

  it('owner has every permission any role has', () => {
    for (const p of rolePermissions.user) expect(can('owner', p)).toBe(true)
    expect(can('owner', 'users:manage')).toBe(true)
  })
})

describe('tokens', () => {
  it('newToken is unique and hashToken is deterministic', () => {
    expect(newToken()).not.toBe(newToken())
    expect(hashToken('a')).toBe(hashToken('a'))
    expect(hashToken('a')).not.toBe(hashToken('b'))
  })

  it('verifyAccess accepts our own token', () => {
    const token = signAccess({ id: 'u1', role: 'owner' })
    expect(verifyAccess(token)).toEqual({ userId: 'u1', role: 'owner' })
  })

  it('verifyAccess rejects garbage, foreign secrets and unknown roles', () => {
    expect(verifyAccess('garbage')).toBeNull()
    expect(verifyAccess(jwt.sign({ role: 'owner' }, 'other-secret-other-secret-other-1', { subject: 'u1' }))).toBeNull()
    expect(verifyAccess(jwt.sign({ role: 'root' }, process.env.JWT_SECRET!, { subject: 'u1' }))).toBeNull()
  })
})
