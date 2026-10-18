import type { Mailer, MailMessage } from './mailer.ts'

// Tests only: keeps sent emails in memory so tests can read the magic link.
export const outbox: MailMessage[] = []

export class MemoryMailer implements Mailer {
  async send(msg: MailMessage): Promise<void> {
    outbox.push(msg)
  }
}
