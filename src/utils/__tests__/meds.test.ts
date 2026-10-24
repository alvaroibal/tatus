import { describe, it, expect } from 'vitest'
import { doseStatus } from '../meds'
import type { CareLog } from '../../db/db'

const at = (h: number, m = 0) => new Date(2026, 9, 24, h, m)
const med = (name: string, d: Date): CareLog => ({ profileId: 1, type: 'med', medName: name, start: d })

describe('doseStatus', () => {
  it('sin dosis recientes no muestra nada', () => {
    expect(doseStatus([med('Paracetamol', new Date(2026, 9, 22, 8))], at(12))).toEqual([])
  })

  it('paracetamol: siguiente a las 6 h', () => {
    const [s] = doseStatus([med('Paracetamol 100 mg/ml', at(8))], at(12))
    expect(s.label).toBe('Paracetamol')
    expect(s.nextAllowed).toEqual(at(14))
    expect(s.canGiveNow).toBe(false)
  })

  it('ibuprofeno reconoce el nombre comercial y usa 8 h', () => {
    const [s] = doseStatus([med('Dalsy', at(6))], at(15))
    expect(s.label).toBe('Ibuprofeno')
    expect(s.nextAllowed).toEqual(at(14))
    expect(s.canGiveNow).toBe(true)
  })

  it('con el máximo diario, espera a que salga la primera dosis de las 24 h', () => {
    const logs = [
      med('Ibuprofeno', new Date(2026, 9, 23, 22)),
      med('Ibuprofeno', at(6)),
      med('Ibuprofeno', at(14)),
    ]
    const [s] = doseStatus(logs, at(21))
    expect(s.dosesLast24h).toBe(3)
    expect(s.nextAllowed).toEqual(at(22))
  })

  it('separa paracetamol e ibuprofeno', () => {
    const res = doseStatus([med('Paracetamol', at(8)), med('Ibuprofeno', at(9))], at(10))
    expect(res.map(r => r.label)).toEqual(['Paracetamol', 'Ibuprofeno'])
  })
})
