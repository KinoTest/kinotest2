// Pure helpers for the assignment form (expiry date, note, amount) and its display.

export interface FieldsForm {
  /** `yyyy-mm-dd` from a date input, or '' for no expiry. */
  expiresOn: string
  note: string
  /** Text typed by the user (comma or dot as decimal separator), or ''. */
  amount: string
}

export interface ParsedFields {
  expiresAt: string | null
  note: string | null
  amount: number | null
}

export const EMPTY_FIELDS: FieldsForm = { expiresOn: '', note: '', amount: '' }

const NOTE_MAX = 500
const pad = (n: number) => String(n).padStart(2, '0')

/** An assignment expires at the end of the chosen day (local time). */
export function endOfDayIso(date: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const d = new Date(`${date}T23:59:59`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function isoToDateInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseFields(form: FieldsForm): { ok: true; value: ParsedFields } | { ok: false; error: string } {
  let expiresAt: string | null = null
  if (form.expiresOn) {
    expiresAt = endOfDayIso(form.expiresOn)
    if (!expiresAt) return { ok: false, error: 'Data de caducidade non válida' }
  }

  const note = form.note.trim()
  if (note.length > NOTE_MAX) return { ok: false, error: `A nota admite ata ${NOTE_MAX} caracteres` }

  let amount: number | null = null
  const raw = form.amount.trim().replace(',', '.')
  if (raw) {
    amount = Number(raw)
    if (!Number.isFinite(amount) || amount < 0 || Math.round(amount * 100) / 100 !== amount) {
      return { ok: false, error: 'O importe debe ser un número positivo con ata dous decimais' }
    }
  }
  return { ok: true, value: { expiresAt, note: note || null, amount } }
}

export const fieldsFromRow = (row: { expiresAt: string | null; note: string | null; amount: number | null }): FieldsForm => ({
  expiresOn: isoToDateInput(row.expiresAt),
  note: row.note ?? '',
  amount: row.amount === null ? '' : String(row.amount),
})

export const isExpired = (expiresAt: string | null, now: Date = new Date()): boolean =>
  expiresAt !== null && new Date(expiresAt) <= now

export const formatDate = (iso: string): string => new Date(iso).toLocaleDateString('gl-ES')

export const formatEuro = (amount: number): string =>
  new Intl.NumberFormat('gl-ES', { style: 'currency', currency: 'EUR' }).format(amount)
