import { prisma } from '../db.ts'

const select = {
  id: true,
  email: true,
  role: true,
  confirmedAt: true,
  createdAt: true,
  _count: { select: { assignments: true } },
} as const

export const userRepository = {
  list: (search?: string) =>
    prisma.user.findMany({
      where: search ? { email: { contains: search, mode: 'insensitive' } } : {},
      select,
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),

  get: (id: string) => prisma.user.findUnique({ where: { id }, select }),
}
