import { prisma } from '../db.ts'

export const contentRepository = {
  list: () => prisma.contentItem.findMany({ orderBy: { createdAt: 'desc' } }),

  create: (data: { title: string; description: string; authorId: string }) =>
    prisma.contentItem.create({ data }),

  /** Returns the updated item, or null if it does not exist. */
  async update(id: string, data: { title?: string; description?: string }) {
    const { count } = await prisma.contentItem.updateMany({ where: { id }, data })
    return count === 0 ? null : prisma.contentItem.findUnique({ where: { id } })
  },

  /** Returns true if something was deleted. */
  async remove(id: string): Promise<boolean> {
    const { count } = await prisma.contentItem.deleteMany({ where: { id } })
    return count > 0
  },
}
