import { authRepository } from './repository.ts'

const INTERVAL_MS = 6 * 60 * 60 * 1000
const GRACE_MS = 24 * 60 * 60 * 1000

async function run(): Promise<void> {
  try {
    const n = await authRepository.deleteExpiredTokens(new Date(Date.now() - GRACE_MS))
    if (n.login || n.refresh) console.log(`[auth] tokens caducados borrados: ${n.login} login, ${n.refresh} refresh`)
  } catch (err) {
    console.error('[auth] erro no borrado de tokens', err)
  }
}

export function startAuthCleanup(): void {
  void run()
  setInterval(run, INTERVAL_MS).unref() // unref: does not block process shutdown
}