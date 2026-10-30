import { z } from 'zod'

// Same shape as the document `id` (UUID or legacy readable id).
export const presignRequestSchema = z.object({
  contentId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/),
  hash: z.string().regex(/^[a-f0-9]{64}$/), // SHA-256 of the WebP bytes, hex
})
export type PresignRequest = z.infer<typeof presignRequestSchema>

/** `uploadUrl` is absent when the object already exists (nothing to upload). */
export type PresignResponse = { key: string; exists: boolean; uploadUrl?: string }

/** The browser must send this exact Content-Type in the PUT (it is part of the signature). */
export const IMAGE_CONTENT_TYPE = 'image/webp'
