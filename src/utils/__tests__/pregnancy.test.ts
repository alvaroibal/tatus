import { describe, it, expect } from 'vitest'
import { dueDateFromLastPeriod, dueDateFromConception, fertileCycles, gestationalAge } from '../pregnancy'
import { ageInMonths, formatAge, weekOfLifeLabel } from '../age'
import { classify } from '../../data/whoPercentiles'

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day)

describe('pregnancy', () => {
  it('Naegele: FUR + 280 días', () => {
    expect(dueDateFromLastPeriod(d(2026, 1, 1))).toEqual(d(2026, 10, 8))
  })

  it('ajusta por ciclos largos', () => {
    expect(dueDateFromLastPeriod(d(2026, 1, 1), 32)).toEqual(d(2026, 10, 12))
  })

  it('concepción + 266 días', () => {
    expect(dueDateFromConception(d(2026, 1, 15))).toEqual(d(2026, 10, 8))
  })

  it('semana gestacional', () => {
    expect(gestationalAge(d(2026, 10, 8), d(2026, 1, 1))).toEqual({ weeks: 0, days: 0 })
    expect(gestationalAge(d(2026, 10, 8), d(2026, 3, 1))).toEqual({ weeks: 8, days: 3 })
  })

  it('ventana fértil de un ciclo de 28 días', () => {
    const [c] = fertileCycles(d(2026, 10, 1), 28, 1, d(2026, 10, 5))
    expect(c.ovulation).toEqual(d(2026, 10, 15))
    expect(c.fertileStart).toEqual(d(2026, 10, 10))
    expect(c.fertileEnd).toEqual(d(2026, 10, 16))
    expect(c.nextPeriod).toEqual(d(2026, 10, 29))
  })

  it('avanza al ciclo actual si la FUR es antigua', () => {
    const [c] = fertileCycles(d(2026, 8, 1), 28, 1, d(2026, 10, 5))
    expect(c.periodStart).toEqual(d(2026, 9, 26))
  })
})

describe('age', () => {
  it('meses cumplidos', () => {
    expect(ageInMonths(d(2026, 1, 31), d(2026, 3, 1))).toBe(1)
    expect(ageInMonths(d(2025, 10, 19), d(2026, 10, 19))).toBe(12)
  })

  it('formato legible', () => {
    expect(formatAge(d(2026, 10, 14), d(2026, 10, 19))).toBe('5 días')
    expect(formatAge(d(2026, 6, 1), d(2026, 10, 15))).toBe('4 meses y 2 semanas')
    expect(formatAge(d(2024, 7, 1), d(2026, 10, 19))).toBe('2 años y 3 meses')
  })

  it('etiqueta de semana', () => {
    expect(weekOfLifeLabel(-10)).toBe('Semana 30 de embarazo')
    expect(weekOfLifeLabel(10)).toBe('Semana 10 de vida')
    expect(weekOfLifeLabel(78)).toBe('17 meses')
  })
})

describe('percentiles OMS', () => {
  it('clasifica respecto a P3/P97', () => {
    expect(classify('weight', 'boy', 0, 3.3)).toBe('cerca de la media (P50)')
    expect(classify('weight', 'girl', 26, 4.5)).toMatch(/por debajo del P3/)
    expect(classify('height', 'boy', 52, 85)).toMatch(/por encima del P97/)
  })
})
