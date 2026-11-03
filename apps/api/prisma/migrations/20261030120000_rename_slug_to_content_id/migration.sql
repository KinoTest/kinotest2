-- Rename only (keeps the data): the column stores the document id (a UUID), not a slug.
ALTER TABLE "ContentItem" RENAME COLUMN "slug" TO "contentId";
ALTER INDEX "ContentItem_slug_lang_key" RENAME TO "ContentItem_contentId_lang_key";
