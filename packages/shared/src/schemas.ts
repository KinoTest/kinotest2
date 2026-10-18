import { z } from 'zod'

export const contentItemInputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
})
export type ContentItemInput = z.infer<typeof contentItemInputSchema>
