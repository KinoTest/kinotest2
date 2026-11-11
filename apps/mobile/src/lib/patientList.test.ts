import { describe, expect, it } from 'vitest'
import { filterPatients, patientUrl, sortPatients } from './patientList.ts'

const p = (...names: string[]) => names.map((name) => ({ name }))

describe('sortPatients', () => {
  it('sorts by name ignoring case and accents, without changing the input', () => {
    const input = p('xoán', 'Álvaro', 'beatriz', 'Ana')
    expect(sortPatients(input).map((x) => x.name)).toEqual(['Álvaro', 'Ana', 'beatriz', 'xoán'])
    expect(input[0].name).toBe('xoán')
  })
})

describe('filterPatients', () => {
  const all = p('José Pérez', 'María López', 'Ana María Souto')

  it('returns everything for an empty or blank query', () => {
    expect(filterPatients(all, '')).toBe(all)
    expect(filterPatients(all, '   ')).toBe(all)
  })

  it('ignores case and accents', () => {
    expect(filterPatients(all, 'JOSE').map((x) => x.name)).toEqual(['José Pérez'])
    expect(filterPatients(all, 'maria').map((x) => x.name)).toEqual(['María López', 'Ana María Souto'])
  })

  it('needs every word, in any order and partially typed', () => {
    expect(filterPatients(all, 'sou mar').map((x) => x.name)).toEqual(['Ana María Souto'])
    expect(filterPatients(all, 'maría pérez')).toEqual([])
  })
})

describe('patientUrl', () => {
  it('encodes the id', () => {
    expect(patientUrl('a/b')).toBe('/patients/a%2Fb')
  })
})
