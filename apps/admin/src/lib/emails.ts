const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Splits a pasted list (commas, semicolons, spaces or new lines) into unique lowercase emails; invalid ones apart. */
export function parseEmails(text: string): { emails: string[]; invalid: string[] } {
  const emails: string[] = []
  const invalid: string[] = []
  for (const raw of text.split(/[\s,;]+/)) {
    const email = raw.toLowerCase()
    if (!email) continue
    const list = EMAIL.test(email) ? emails : invalid
    if (!list.includes(email)) list.push(email)
  }
  return { emails, invalid }
}
