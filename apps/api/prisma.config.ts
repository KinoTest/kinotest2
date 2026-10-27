import { defineConfig } from 'prisma/config'

// Load the shared .env at the repo root (when present; Railway injects real env vars).
try {
  process.loadEnvFile('../../.env')
} catch {}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? '' },
})

