import { defineConfig } from 'vitest/config'
import { TEST_DATABASE_URL } from './test/test-url.ts'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    fileParallelism: false, // one shared test DB
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret-test-secret-test-secret-123',
      APP_URL: 'http://localhost:5173',
      CORS_ORIGINS: 'http://localhost:5173',
      OWNER_EMAIL: 'owner@test.com',
      MAIL_PROVIDER: 'memory',
      LINK_RATE_LIMIT_PER_IP: '100000',
    },
  },
})
