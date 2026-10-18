// Test DB URL: TEST_DATABASE_URL, else DATABASE_URL (from .env) with the database renamed to `kinotest_test`.
for (const file of ['.env', '../../.env']) {
  try {
    process.loadEnvFile(file)
  } catch {
    // file not found: try the next one
  }
}

function resolveUrl(): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL
  const base = process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/postgres'
  const url = new URL(base)
  url.pathname = '/kinotest_test'
  return url.toString()
}

export const TEST_DATABASE_URL = resolveUrl()

/** Safety net: destructive test helpers only run against databases ending in `_test`. */
export function assertTestDatabase(connectionString: string): void {
  const name = new URL(connectionString).pathname.slice(1)
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run tests against non-test database "${name}"`)
  }
}
