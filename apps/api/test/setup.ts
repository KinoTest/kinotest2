import { afterAll, beforeEach } from 'vitest'
import { prisma } from '../src/db.ts'
import { env } from '../src/env.ts'
import { outbox } from '../src/mail/memory.ts'
import { assertTestDatabase } from './test-url.ts'

assertTestDatabase(env.DATABASE_URL)

beforeEach(async () => {
  outbox.length = 0
  await prisma.$executeRawUnsafe(
    'TRUNCATE "User","LoginToken","RefreshToken","ContentItem" CASCADE',
  )
})

afterAll(async () => {
  await prisma.$disconnect()
})
