import { prisma } from '../db.ts'

const include = {
  user: { select: { id: true, email: true } },
  contentItem: { select: { id: true, contentId: true, lang: true, title: true } },
} as const

type Fields = { expiresAt: Date | null; note: string | null; amount: number | null }

const notExpired = (now: Date) => ({ OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] })

export const assignmentRepository = {
  list: (where: { userId?: string; contentItemId?: string }) =>
    prisma.therapyAssignment.findMany({ where, include, orderBy: { createdAt: 'desc' } }),

  /** Creates every (user, item) pair; pairs that already exist are kept untouched. Ids must be unique. */
  async createMany(userIds: string[], contentItemIds: string[], fields: Fields, assignedById: string) {
    const [users, items] = await Promise.all([
      prisma.user.count({ where: { id: { in: userIds } } }),
      prisma.contentItem.count({ where: { id: { in: contentItemIds } } }),
    ])
    if (users !== userIds.length || items !== contentItemIds.length) return { status: 'not_found' } as const
    const data = userIds.flatMap((userId) =>
      contentItemIds.map((contentItemId) => ({ userId, contentItemId, assignedById, ...fields })),
    )
    const { count } = await prisma.therapyAssignment.createMany({ data, skipDuplicates: true })
    return { status: 'ok', created: count, skipped: data.length - count } as const
  },

  async deleteMany(userIds: string[], contentItemIds: string[]) {
    const { count } = await prisma.therapyAssignment.deleteMany({
      where: { userId: { in: userIds }, contentItemId: { in: contentItemIds } },
    })
    return count
  },

  /** Returns null if the assignment does not exist. */
  async update(id: string, data: Partial<Fields>) {
    const { count } = await prisma.therapyAssignment.updateMany({ where: { id }, data })
    if (!count) return null
    return prisma.therapyAssignment.findUnique({ where: { id }, include })
  },

  /** What a therapist can see: assigned and not expired. No note or amount. */
  listActive: (userId: string, now: Date) =>
    prisma.therapyAssignment.findMany({
      where: { userId, ...notExpired(now) },
      select: {
        expiresAt: true,
        contentItem: {
          select: { id: true, contentId: true, lang: true, title: true, formatVersion: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

  getActive: (userId: string, contentItemId: string, now: Date) =>
    prisma.therapyAssignment.findFirst({
      where: { userId, contentItemId, ...notExpired(now) },
      select: {
        contentItem: {
          select: {
            id: true,
            contentId: true,
            lang: true,
            title: true,
            formatVersion: true,
            data: true,
            updatedAt: true,
          },
        },
      },
    }),
}
