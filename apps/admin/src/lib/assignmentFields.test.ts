import { describe, expect, it } from 'vitest'
import {
  EMPTY_FIELDS,
  endOfDayIso,
  fieldsFromRow,
  isExpired,
  isoToDateInput,
  parseFields,
} from './assignmentFields.ts'

describe('parseFields', () => {
  it('empty form means no expiry, note or amount', () => {
    expect(parseFields(EMPTY_FIELDS)).toEqual({ ok: true, value: { expiresAt: null, note: null, amount: null } })
  })

  it('accepts a comma as the decimal separator and trims the note', () => {
    const res = parseFields({ expiresOn: '', note: '  Curso 2026 ', amount: '49,90' })
    expect(res).toEqual({ ok: true, value: { expiresAt: null, note: 'Curso 2026', amount: 49.9 } })
  })

  it('rejects bad amounts, dates and long notes', () => {
    expect(parseFields({ ...EMPTY_FIELDS, amount: 'abc' }).ok).toBe(false)
    expect(parseFields({ ...EMPTY_FIELDS, amount: '-3' }).ok).toBe(false)
    expect(parseFields({ ...EMPTY_FIELDS, amount: '1.234' }).ok).toBe(false)
    expect(parseFields({ ...EMPTY_FIELDS, expiresOn: '31/12/2026' }).ok).toBe(false)
    expect(parseFields({ ...EMPTY_FIELDS, note: 'x'.repeat(501) }).ok).toBe(false)
  })
})

describe('dates', () => {
  it('the chosen day survives the round trip, whatever the time zone', () => {
    const iso = endOfDayIso('2026-12-31')
    expect(iso).not.toBeNull()
    expect(isoToDateInput(iso)).toBe('2026-12-31')
  })

  it('fieldsFromRow fills the form from a stored assignment', () => {
    const form = fieldsFromRow({ expiresAt: endOfDayIso('2027-01-15'), note: null, amount: 20 })
    expect(form).toEqual({ expiresOn: '2027-01-15', note: '', amount: '20' })
  })

  it('isExpired compares against now; no date never expires', () => {
    const now = new Date('2026-11-02T12:00:00Z')
    expect(isExpired(null, now)).toBe(false)
    expect(isExpired('2026-11-01T00:00:00Z', now)).toBe(true)
    expect(isExpired('2026-11-03T00:00:00Z', now)).toBe(false)
  })
})
