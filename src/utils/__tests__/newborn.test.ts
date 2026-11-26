import { describe, it, expect } from 'vitest'
import { NEWBORN_TASKS, dueLabel, taskDueAt, taskState } from '../../data/newborn'

// Jan: lunes 23/11/2026 a las 16:01
const birth = new Date(2026, 10, 23, 16, 1)
const task = (id: string) => NEWBORN_TASKS.find(t => t.id === id)!

describe('guía del recién nacido', () => {
  it('ids únicos', () => {
    const ids = NEWBORN_TASKS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('la prueba del talón vence a las 72 h del nacimiento', () => {
    expect(taskDueAt(task('talon'), birth)).toEqual(new Date(2026, 10, 26, 16, 1))
  })

  it('clasifica por plazo', () => {
    const now = new Date(2026, 10, 26, 12, 0)
    expect(taskState(task('vit-k'), birth, false, now)).toBe('overdue')
    expect(taskState(task('talon'), birth, false, now)).toBe('now')
    expect(taskState(task('pediatra'), birth, false, now)).toBe('week')
    expect(taskState(task('registro'), birth, false, now)).toBe('later')
    expect(taskState(task('padron'), birth, false, now)).toBe('later')
    expect(taskState(task('ayudas'), birth, false, now)).toBe('anytime')
    expect(taskState(task('vit-k'), birth, true, now)).toBe('done')
  })

  it('etiqueta de plazo legible', () => {
    const now = new Date(2026, 10, 26, 12, 0)
    expect(dueLabel(new Date(2026, 10, 26, 16, 1), now)).toBe('antes de las 16:01')
    expect(dueLabel(new Date(2026, 10, 27, 9, 0), now)).toBe('antes de mañana a las 09:00')
    expect(dueLabel(new Date(2026, 10, 26, 9, 0), now)).toBe('tocaba hace 3 h')
  })
})
