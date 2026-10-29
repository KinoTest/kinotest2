import { z } from 'zod'

const envSchema = z
  .object({
    PORT: z.coerce.number().default(3000),
    DATABASE_URL: z.string().min(1),
    // Comma-separated list of allowed browser/app origins
    CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:4321'),
    JWT_SECRET: z.string().min(32),
    APP_URL: z.string().url(),                       // e.g. http://localhost:5173 | https://staging.kinotest.me
    OWNER_EMAIL: z.string().email().optional(),      // this email becomes `owner` on first login
    MAIL_PROVIDER: z.enum(['console', 'resend', 'memory']).default('console'),
    RESEND_API_KEY: z.string().optional(),
    MAIL_FROM: z.string().optional(),                // e.g. "Kinotest <login@kinotest.me>"
    LINK_RATE_LIMIT_PER_IP: z.coerce.number().default(20),
  })
  .superRefine((e, ctx) => {
    if (e.MAIL_PROVIDER !== 'resend') return
    if (!e.RESEND_API_KEY) {
      ctx.addIssue({ code: 'custom', path: ['RESEND_API_KEY'], message: 'Required when MAIL_PROVIDER=resend' })
    }
    // "Name <user@domain>" or "user@domain"
    if (!e.MAIL_FROM || !/^(?:[^<>@]+<[^<>@\s]+@[^<>@\s]+>|[^<>@\s]+@[^<>@\s]+)$/.test(e.MAIL_FROM.trim())) {
      ctx.addIssue({ code: 'custom', path: ['MAIL_FROM'], message: 'Required when MAIL_PROVIDER=resend, as "Name <user@domain>"' })
    }
  })

export const env = envSchema.parse(process.env)
