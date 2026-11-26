import { describe, it, expect } from 'vitest'
import { feedProgress, feedStatus } from '../feeding'
import type { CareLog } from '../../db/db'

const at = (h: number, m = 0) => new Date(2026, 10, 24, h, m)
const bottle = (d: Date): CareLog => ({ profileId: 1, type: 'bottle', start: d, amountMl: 60 })
const breast = (d: Date, end?: Date): CareLog => ({ profileId: 1, type: 'breast', side: 'L', start: d, end })

describe('feedStatus', () => {
  it('sin tomas devuelve none', () => {
    expect(feedStatus([], at(10)).level).toBe('none')
  })

  it('ignora pañales y sueño al buscar la última toma', () => {
    const logs: CareLog[] = [bottle(at(8)), { profileId: 1, type: 'diaper', diaper: 'wet', start: at(10) }]
    const s = feedStatus(logs, at(9))
    expect(s.last?.start).toEqual(at(8))
  })

  it('cuenta desde el inicio de la toma: ok antes de 2 h 30', () => {
    const s = feedStatus([breast(at(8), at(8, 40))], at(10, 29))
    expect(s.level).toBe('ok')
    expect(s.dueAt).toEqual(at(11))
    expect(s.lateAt).toEqual(at(12))
  })

  it('avisa media hora antes de las 3 h', () => {
    expect(feedStatus([bottle(at(8))], at(10, 30)).level).toBe('soon')
  })

  it('a las 3 h ya toca', () => {
    expect(feedStatus([bottle(at(8))], at(11)).level).toBe('due')
  })

  it('a las 4 h es alerta', () => {
    expect(feedStatus([bottle(at(8)), bottle(at(6))], at(12, 5)).level).toBe('late')
  })

  it('pecho en curso cuenta como comiendo', () => {
    expect(feedStatus([breast(at(8))], at(13)).level).toBe('feeding')
  })

  it('la barra se llena hasta las 4 h', () => {
    expect(feedProgress(feedStatus([bottle(at(8))], at(10)))).toBeCloseTo(0.5)
    expect(feedProgress(feedStatus([bottle(at(8))], at(14)))).toBe(1)
  })
})
