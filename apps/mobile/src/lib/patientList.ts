// Pure helpers for the list of patients (no API, so they can be tested without a session).
import { normalize } from './search.ts'

export const patientUrl = (id: string): string => `/patients/${encodeURIComponent(id)}`

/** By name, ignoring case and accents. */
export const sortPatients = <T extends { name: string }>(items: T[]): T[] =>
  [...items].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))

/** Patients whose name has every word of the query, ignoring case and accents ("jose" finds "José"). */
export function filterPatients<T extends { name: string }>(items: T[], query: string): T[] {
  const words = normalize(query).trim().split(/\s+/).filter(Boolean)
  if (!words.length) return items
  return items.filter((p) => {
    const name = normalize(p.name)
    return words.every((w) => name.includes(w))
  })
}
