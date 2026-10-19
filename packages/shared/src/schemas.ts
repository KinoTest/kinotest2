import { z } from 'zod'

export const contentItemInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
})
export type ContentItemInput = z.infer<typeof contentItemInputSchema>

// PATCH: any subset of the fields (at least one). It is not derived from
// contentItemInputSchema: its .default('') would reset `description` when omitted.
export const contentItemUpdateSchema = z
  .object({ title: z.string().min(1).max(200), description: z.string().max(5000) })
  .partial()
  .refine((d) => Object.keys(d).length > 0, { message: 'Empty update' })
export type ContentItemUpdate = z.infer<typeof contentItemUpdateSchema>