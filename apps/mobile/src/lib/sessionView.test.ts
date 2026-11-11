import { describe, expect, it } from 'vitest'
import {
  countSelectedUnder,
  formatSessionDate,
  remedyTrail,
  sessionRemedyUrl,
  sortForDisplay,
  todayIso,
  type ListedRemedy,
} from './sessionView.ts'

describe('dates', () => {
  it('formats a day with its weekday, in Galician, capitalised and without shifting it', () => {
    expect(formatSessionDate('2026-11-11')).toBe('Mércores, 11 de novembro de 2026')
    expect(formatSessionDate('2026-01-01')).toBe('Xoves, 1 de xaneiro de 2026')
    expect(formatSessionDate('nonsense')).toBe('nonsense')
    expect(formatSessionDate('2026-06-28')).toBe('Domingo, 28 de xuño de 2026')
  })

  it('todayIso uses the local date', () => {
    expect(todayIso(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('countSelectedUnder', () => {
  const sel = [
    { contentItemId: 'a', path: [0, 0] },
    { contentItemId: 'a', path: [0, 1, 0] },
    { contentItemId: 'a', path: [1] },
    { contentItemId: 'b', path: [0, 0] },
  ]
  it('counts the remedies inside a therapy or category', () => {
    expect(countSelectedUnder(sel, 'a', [])).toBe(3)
    expect(countSelectedUnder(sel, 'a', [0])).toBe(2)
    expect(countSelectedUnder(sel, 'a', [0, 1])).toBe(1)
    expect(countSelectedUnder(sel, 'a', [2])).toBe(0)
    expect(countSelectedUnder(sel, 'b', [])).toBe(1)
  })
  it('does not count the remedy at the path itself', () => {
    expect(countSelectedUnder(sel, 'a', [1])).toBe(0)
  })
})

describe('sortForDisplay', () => {
  const r = (therapyTitle: string, path: number[], name = path.join('.')): ListedRemedy => ({
    contentItemId: therapyTitle,
    therapyTitle,
    path,
    trail: [],
    name,
  })

  it('groups by therapy and category, a category before its subcategories, keeping the original index', () => {
    const items = [r('B', [0]), r('A', [0, 2, 0]), r('A', [0, 3]), r('A', [1]), r('A', [0, 1])]
    const sorted = sortForDisplay(items)
    expect(sorted.map((x) => `${x.item.therapyTitle}:${x.item.path.join('.')}`)).toEqual([
      'A:1',
      'A:0.1',
      'A:0.3',
      'A:0.2.0',
      'B:0',
    ])
    expect(sorted[0].index).toBe(3)
  })
})

it('remedyTrail and urls', () => {
  expect(remedyTrail({ therapyTitle: 'T', trail: ['A', 'B'] })).toBe('T › A › B')
  expect(sessionRemedyUrl('p', 's', 2)).toBe('/patients/p/sessions/s/remedies/2')
})
