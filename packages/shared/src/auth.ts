import { z } from 'zod'
import { roleSchema } from './roles.ts'

export const emailSchema = z.string().trim().toLowerCase().email()
const tokenSchema = z.string().min(20).max(200)

export const requestLinkSchema = z.object({ email: emailSchema })
export const verifyLinkSchema = z.object({ token: tokenSchema })
export const refreshSchema = z.object({ refreshToken: tokenSchema })

export const authUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  role: roleSchema,
})
export const sessionSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: authUserSchema,
})

export type AuthUser = z.infer<typeof authUserSchema>
export type Session = z.infer<typeof sessionSchema>
// Remember to export from packages/shared index: export * from './auth.ts'
