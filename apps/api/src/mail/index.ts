import { env } from '../env.ts'
import { ConsoleMailer } from './console.ts'
import type { Mailer } from './mailer.ts'
import { MemoryMailer } from './memory.ts'
import { ResendMailer } from './resend.ts'

function createMailer(): Mailer {
  if (env.MAIL_PROVIDER === 'resend') {
    if (!env.RESEND_API_KEY || !env.MAIL_FROM) {
      throw new Error('MAIL_PROVIDER=resend requires RESEND_API_KEY and MAIL_FROM')
    }
    return new ResendMailer(env.RESEND_API_KEY, env.MAIL_FROM)
  }
  if (env.MAIL_PROVIDER === 'memory') return new MemoryMailer()
  return new ConsoleMailer()
}

// To change provider: add a class implementing Mailer and a branch above.
export const mailer = createMailer()
