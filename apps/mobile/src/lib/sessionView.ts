// Pure helpers for the therapy sessions (no API, so they can be tested without a session).
import type { RemedyRef } from '@kinotest/shared'

const enc = encodeURIComponent

export const sessionsBase = (patientId: string): string => `/patients/${enc(patientId)}/sessions`
export const newSessionUrl = (patientId: string): string => `${sessionsBase(patientId)}/new`
export const sessionUrl = (patientId: string, id: string): string => `${sessionsBase(patientId)}/${enc(id)}`
/** With `notes`, the editor opens with the notes being edited. */
export const editSessionUrl = (patientId: string, id: string, notes = false): string =>
  `${sessionUrl(patientId, id)}/edit${notes ? '?notes=1' : ''}`
/** `index` is the position of the remedy in the session as stored (not as shown). */
export const sessionRemedyUrl = (patientId: string, id: string, index: number): string =>
  `${sessionUrl(patientId, id)}/remedies/${index}`

/** Today in the device's time zone, "YYYY-MM-DD". */
export function todayIso(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

// Written out instead of Intl: browsers and Android WebViews may ship without Galician locale data.
const WEEKDAYS = ['Domingo', 'Luns', 'Martes', 'Mércores', 'Xoves', 'Venres', 'Sábado']
const MONTHS = [
  'xaneiro', 'febreiro', 'marzo', 'abril', 'maio', 'xuño',
  'xullo', 'agosto', 'setembro', 'outubro', 'novembro', 'decembro',
]

/** "2026-11-11" -> "Mércores, 11 de novembro de 2026". The day is read as is (no time zone shift). */
export function formatSessionDate(day: string): string {
  const date = new Date(`${day}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(date.getTime())) return day
  return `${WEEKDAYS[date.getUTCDay()]}, ${date.getUTCDate()} de ${MONTHS[date.getUTCMonth()]} de ${date.getUTCFullYear()}`
}

// --- Selection of remedies while browsing a therapy ---

type Located = { contentItemId: string; path: number[] }

export const remedyKey = (r: Located): string => `${r.contentItemId}|${r.path.join('.')}`

/** Key of a place visited while browsing: a therapy (empty path) or one of its categories. */
export const placeKey = (contentItemId: string, path: number[]): string => `${contentItemId}:${path.join('.')}`

const startsWith = (path: number[], prefix: number[]) =>
  path.length > prefix.length && prefix.every((n, i) => path[i] === n)

/** How many of the selected remedies are inside the therapy (`path` empty) or category at `path`. */
export const countSelectedUnder = (selected: Iterable<Located>, contentItemId: string, path: number[]): number => {
  let n = 0
  for (const r of selected) if (r.contentItemId === contentItemId && startsWith(r.path, path)) n += 1
  return n
}

/** What the app sends to the API for each selected remedy. */
export const toRef = (r: RemedyRef): RemedyRef => ({ contentItemId: r.contentItemId, path: r.path, name: r.name })

// --- Showing the remedies of a session ---

/** What a list of remedies needs to show each one: where it is (to group) and the names on the way. */
export type ListedRemedy = Located & { name: string; therapyTitle: string; trail: string[] }

function comparePaths(a: number[], b: number[]): number {
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) if (a[i] !== b[i]) return a[i] - b[i]
  return a.length - b.length
}

/**
 * The remedies in display order, each with its position in the input: by therapy, then the remedies of one category
 * together (categories in the order of the therapy, a category before its subcategories), then in therapy order.
 */
export function sortForDisplay<T extends ListedRemedy>(items: T[]): { item: T; index: number }[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(({ item: a }, { item: b }) => {
      return (
        a.therapyTitle.localeCompare(b.therapyTitle, undefined, { sensitivity: 'base' }) ||
        a.contentItemId.localeCompare(b.contentItemId) ||
        comparePaths(a.path.slice(0, -1), b.path.slice(0, -1)) ||
        a.path[a.path.length - 1] - b.path[b.path.length - 1]
      )
    })
}

/** "Therapy › Category › Subcategory". */
export const remedyTrail = (r: { therapyTitle: string; trail: string[] }): string => [r.therapyTitle, ...r.trail].join(' › ')
