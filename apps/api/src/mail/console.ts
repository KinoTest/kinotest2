import type { Mailer, MailMessage } from './mailer.ts'

// Local development: prints the email (with the magic link) to the console.
export class ConsoleMailer implements Mailer {
  async send(msg: MailMessage): Promise<void> {
    console.log(`\n--- EMAIL to ${msg.to} ---\n${msg.subject}\n\n${msg.text}\n---\n`)
  }
}
