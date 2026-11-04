import { describe, expect, it } from 'vitest'
import { parseEmails } from './emails.ts'

describe('parseEmails', () => {
  it('splits on commas, semicolons, spaces and new lines; lowercases and deduplicates', () => {
    const { emails, invalid } = parseEmails('A@x.com, b@x.com;\nc@x.com  a@X.com')
    expect(emails).toEqual(['a@x.com', 'b@x.com', 'c@x.com'])
    expect(invalid).toEqual([])
  })

  it('reports invalid addresses apart', () => {
    const { emails, invalid } = parseEmails('ok@x.com, nope, @x.com, a@b')
    expect(emails).toEqual(['ok@x.com'])
    expect(invalid).toEqual(['nope', '@x.com', 'a@b'])
  })

  it('returns nothing for an empty text', () => {
    expect(parseEmails('  \n ')).toEqual({ emails: [], invalid: [] })
  })
})
