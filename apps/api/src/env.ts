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
    // Image storage (Cloudflare R2 in Staging/Production, MinIO locally, memory in tests)
    IMAGE_STORE: z.enum(['s3', 'memory']).default('memory'),
    MEDIA_URL: z.string().url().optional(),          // public base URL of the bucket, no trailing slash
    R2_ENDPOINT: z.string().url().optional(),        // https://<account>.r2.cloudflarestorage.com | http://localhost:9000
    R2_BUCKET: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
  })
  .superRefine((e, ctx) => {
    if (e.IMAGE_STORE === 's3') {
      for (const k of ['R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const) {
        if (!e[k]) ctx.addIssue({ code: 'custom', path: [k], message: 'Required when IMAGE_STORE=s3' })
      }
    }
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
