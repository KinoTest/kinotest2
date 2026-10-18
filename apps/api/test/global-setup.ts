import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { assertTestDatabase, TEST_DATABASE_URL } from './test-url.ts'

export default async function setup(): Promise<void> {
  assertTestDatabase(TEST_DATABASE_URL)
  const dbName = new URL(TEST_DATABASE_URL).pathname.slice(1)

  // Create the test database if missing (connect to the maintenance DB).
  const admin = new pg.Client({ connectionString: new URL('/postgres', TEST_DATABASE_URL).toString() })
  await admin.connect()
  const { rowCount } = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName])
  if (!rowCount) await admin.query(`CREATE DATABASE "${dbName}"`)
  await admin.end()

  // Apply committed migrations.
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: fileURLToPath(new URL('..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  })
}
