import { Resend } from 'resend'
import type { Mailer, MailMessage } from './mailer.ts'

export class ResendMailer implements Mailer {
  private client: Resend
  private from: string

  constructor(apiKey: string, from: string) {
    this.client = new Resend(apiKey)
    this.from = from
  }

  async send(msg: MailMessage): Promise<void> {
    const { error } = await this.client.emails.send({ from: this.from, ...msg })
    if (error) throw new Error(`Resend: ${error.message}`)
  }
}
