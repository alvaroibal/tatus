import { describe, it, expect } from 'vitest'
import { medCalendarEvents, medOwnerLabel, medStatus, planEnd, tooEarly } from '../momMeds'
import type { MedDose, MedPlan } from '../../db/db'

const at = (d: number, h: number, m = 0) => new Date(2026, 10, d, h, m)
const plan = (over: Partial<MedPlan> = {}): MedPlan => ({
  id: 1, uid: 'p1', profileId: 1, name: 'Ibuprofeno 600 mg', everyHours: 8, startAt: at(24, 8), active: true, ...over,
})
const dose = (d: Date, planUid = 'p1'): MedDose => ({ profileId: 1, planUid, takenAt: d })

describe('medStatus', () => {
  it('sin tomas, la próxima es el inicio', () => {
    const s = medStatus(plan(), [], at(24, 7))
    expect(s.nextDue).toEqual(at(24, 8))
    expect(s.level).toBe('ok')
  })

  it('la próxima es la última + intervalo', () => {
    const s = medStatus(plan(), [dose(at(24, 8)), dose(at(24, 16))], at(24, 18))
    expect(s.nextDue).toEqual(at(25, 0))
    expect(s.takenLast24h).toBe(2)
  })

  it('ignora tomas de otros planes', () => {
    const s = medStatus(plan(), [dose(at(24, 8)), dose(at(24, 12), 'otro')], at(24, 13))
    expect(s.last).toEqual(at(24, 8))
  })

  it('niveles: soon 30 min antes, due a la hora, late con 1 h de retraso', () => {
    const doses = [dose(at(24, 8))]
    expect(medStatus(plan(), doses, at(24, 15, 35)).level).toBe('soon')
    expect(medStatus(plan(), doses, at(24, 16, 10)).level).toBe('due')
    expect(medStatus(plan(), doses, at(24, 17, 0)).level).toBe('late')
  })

  it('termina cuando la próxima cae después del fin del tratamiento', () => {
    const p = plan({ days: 1 })
    expect(planEnd(p)).toEqual(at(25, 8))
    const s = medStatus(p, [dose(at(24, 8)), dose(at(24, 16)), dose(at(25, 0))], at(25, 1))
    expect(s.level).toBe('finished')
  })

  it('en pausa no avisa', () => {
    expect(medStatus(plan({ active: false }), [], at(24, 20)).level).toBe('paused')
  })
})

describe('tooEarly', () => {
  it('avisa si no han pasado 3/4 del intervalo', () => {
    const s = medStatus(plan(), [dose(at(24, 8))], at(24, 11))
    expect(tooEarly(s, at(24, 11))).toBe(true)
    expect(tooEarly(s, at(24, 15))).toBe(false)
  })
})

describe('medCalendarEvents', () => {
  it('crea una alarma por toma hasta el final del tratamiento', () => {
    const p = plan({ days: 2 })
    const s = medStatus(p, [dose(at(24, 8))], at(24, 9))
    const ev = medCalendarEvents(s, 'Natalia', at(24, 9))
    expect(ev.map(e => e.start)).toEqual([at(24, 16), at(25, 0), at(25, 8), at(25, 16), at(26, 0)])
    expect(ev[0].title).toContain('Natalia')
    expect(ev[0].alarmMinutesBefore).toBe(0)
  })

  it('sin duración, limita a 7 días', () => {
    const s = medStatus(plan({ everyHours: 24 }), [], at(24, 7))
    expect(medCalendarEvents(s, 'mamá', at(24, 7))).toHaveLength(7)
  })
})

describe('medOwnerLabel', () => {
  it('usa el nombre de la pareja si quien usa el móvil es papá', () => {
    expect(medOwnerLabel('papa', 'Natalia')).toEqual({ title: 'Medicación de Natalia', who: 'Natalia' })
    expect(medOwnerLabel('mama', 'Álvaro').title).toBe('Tu medicación')
    expect(medOwnerLabel(undefined, undefined).who).toBe('mamá')
  })
})
