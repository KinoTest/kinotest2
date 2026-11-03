import type { ContentDocument } from '@kinotest/shared'
import { prisma } from '../db.ts'

type Row = {
  contentId: string
  lang: string
  title: string
  formatVersion: number
  data: ContentDocument
}

// Listings skip `data`: a document can weigh hundreds of KB.
const summary = {
  id: true,
  contentId: true,
  lang: true,
  title: true,
  formatVersion: true,
  authorId: true,
  createdAt: true,
  updatedAt: true,
} as const

// `data` is validated with Zod before it gets here; Prisma's Json type cannot express the recursive shape.
const toData = <T extends Row>(row: T) => ({ ...row, data: row.data as never })

export const contentRepository = {
  list: () => prisma.contentItem.findMany({ select: summary, orderBy: { createdAt: 'desc' } }),

  get: (id: string) => prisma.contentItem.findUnique({ where: { id } }),

  async create(row: Row & { authorId: string }) {
    const clash = await prisma.contentItem.findUnique({
      where: { contentId_lang: { contentId: row.contentId, lang: row.lang } },
      select: { id: true },
    })
    if (clash) return { status: 'conflict' } as const
    return { status: 'ok', item: await prisma.contentItem.create({ data: toData(row) }) } as const
  },

  /** Replaces the whole document. */
  async replace(id: string, row: Row) {
    const current = await prisma.contentItem.findUnique({ where: { id }, select: { id: true } })
    if (!current) return { status: 'not_found' } as const
    const clash = await prisma.contentItem.findFirst({
      where: { contentId: row.contentId, lang: row.lang, NOT: { id } },
      select: { id: true },
    })
    if (clash) return { status: 'conflict' } as const
    return { status: 'ok', item: await prisma.contentItem.update({ where: { id }, data: toData(row) }) } as const
  },

  /** Refuses to delete an item that therapists still have assigned. */
  async remove(id: string) {
    const item = await prisma.contentItem.findUnique({
      where: { id },
      select: { _count: { select: { assignments: true } } },
    })
    if (!item) return { status: 'not_found' } as const
    if (item._count.assignments > 0) return { status: 'assigned', count: item._count.assignments } as const
    try {
      await prisma.contentItem.delete({ where: { id } })
    } catch (error) {
      // Assigned between the check and the delete: the foreign key (RESTRICT) stops it.
      if ((error as { code?: string }).code === 'P2003') return { status: 'assigned', count: 1 } as const
      throw error
    }
    return { status: 'ok' } as const
  },
}
