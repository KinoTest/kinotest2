import type { ContentDocument } from '@kinotest/shared'
import { prisma } from '../db.ts'

type Row = {
  slug: string
  lang: string
  title: string
  formatVersion: number
  data: ContentDocument
}

// Listings skip `data`: a document can weigh hundreds of KB.
const summary = {
  id: true,
  slug: true,
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
      where: { slug_lang: { slug: row.slug, lang: row.lang } },
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
      where: { slug: row.slug, lang: row.lang, NOT: { id } },
      select: { id: true },
    })
    if (clash) return { status: 'conflict' } as const
    return { status: 'ok', item: await prisma.contentItem.update({ where: { id }, data: toData(row) }) } as const
  },

  /** Returns true if something was deleted. */
  async remove(id: string): Promise<boolean> {
    const { count } = await prisma.contentItem.deleteMany({ where: { id } })
    return count > 0
  },
}
