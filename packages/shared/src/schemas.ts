import { z } from 'zod'

/** Version of the JSON format of a content document. Raise it (and migrate the stored rows) when the shape changes. */
export const CONTENT_FORMAT_VERSION = 1

const nameSchema = z.string().trim().min(1).max(200)

// Markdown text. It is stored raw: sanitize it when rendering, not when saving.
const markdownSchema = z.string().max(20000)

// An image is the key of an object in the media bucket (e.g. "biomagnetic-pair/<hash>.webp"),
// never a URL: the public base URL (MEDIA_URL) is added when rendering.
const imageKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9._\-/]{0,199}$/)
  .refine((key) => !key.includes('..'), { message: 'Invalid image key' })

export type Remedy = { type: 'remedy'; name: string; description: string; images: string[] }
export type Catalog = { type: 'catalog'; name: string; notes?: string; contents: Array<Catalog | Remedy> }

export const remedySchema: z.ZodType<Remedy> = z.object({
  type: z.literal('remedy'),
  name: nameSchema,
  description: markdownSchema,
  images: z.array(imageKeySchema).max(20),
})

// A catalog groups remedies and/or other catalogs (categories), at any depth.
export const catalogSchema: z.ZodType<Catalog> = z.lazy(() =>
  z.object({
    type: z.literal('catalog'),
    name: nameSchema,
    notes: markdownSchema.optional(),
    contents: z.array(z.union([catalogSchema, remedySchema])).max(500),
  }),
)

// Root of a content document (one stored row): a catalog with an identity.
// `id` + `lang` identify it; both are unique together. The admin creates the `id` as a UUID when a therapy is
// created; older readable ids (e.g. "biomagneticPair") are still valid.
export const contentDocumentSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/),
  lang: z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/),
  formatVersion: z.literal(CONTENT_FORMAT_VERSION).default(CONTENT_FORMAT_VERSION),
  type: z.literal('catalog'),
  name: nameSchema,
  notes: markdownSchema.optional(),
  contents: z.array(z.union([catalogSchema, remedySchema])).max(500),
})
export type ContentDocument = z.infer<typeof contentDocumentSchema>