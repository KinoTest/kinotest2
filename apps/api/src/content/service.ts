import type { ContentDocument } from '@kinotest/shared'
import { contentRepository as repo } from './repository.ts'

// The document is the unit of storage: slug, lang and title are copied from it.
const toRow = (doc: ContentDocument) => ({
  slug: doc.id,
  lang: doc.lang,
  title: doc.name,
  formatVersion: doc.formatVersion,
  data: doc,
})

export const contentService = {
  list: () => repo.list(),
  get: (id: string) => repo.get(id),
  create: (doc: ContentDocument, authorId: string) => repo.create({ ...toRow(doc), authorId }),
  replace: (id: string, doc: ContentDocument) => repo.replace(id, toRow(doc)),
  remove: (id: string) => repo.remove(id),
}
