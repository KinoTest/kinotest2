import type { ContentItemInput, ContentItemUpdate } from '@kinotest/shared'
import { contentRepository as repo } from './repository.ts'

// Thin for now (plain CRUD). Business rules for the store will live here.
export const contentService = {
  list: () => repo.list(),
  create: (input: ContentItemInput, authorId: string) => repo.create({ ...input, authorId }),
  update: (id: string, input: ContentItemUpdate) => repo.update(id, input),
  remove: (id: string) => repo.remove(id),
}
