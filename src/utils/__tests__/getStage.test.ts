import { describe, it, expect } from 'vitest'
import { getStage, type Stage } from '../getStage'

const stages: Stage[] = [
  { weekStart: 0, weekEnd: 0, physical: ['P0'], mental: [], emotional: [], fatherTasks: [] },
  { weekStart: 1, weekEnd: 1, physical: ['P1'], mental: [], emotional: [], fatherTasks: [] },
  { weekStart: 3, weekEnd: 4, physical: ['P3-4'], mental: [], emotional: [], fatherTasks: [] },
  { weekStart: 51, weekEnd: 51, physical: ['P51'], mental: [], emotional: [], fatherTasks: [] },
]

describe('getStage', () => {
  it('returns correct entry for week within exact range', () => {
    expect(getStage(0, stages).physical[0]).toBe('P0')
    expect(getStage(1, stages).physical[0]).toBe('P1')
    expect(getStage(3, stages).physical[0]).toBe('P3-4')
    expect(getStage(4, stages).physical[0]).toBe('P3-4')
  })

  it('floor-search fallback for week in mid-array gap (week 2 → entry at week 1)', () => {
    expect(getStage(2, stages).physical[0]).toBe('P1')
  })

  it('last-entry fallback for week > 51', () => {
    expect(getStage(100, stages).physical[0]).toBe('P51')
    expect(getStage(52, stages).physical[0]).toBe('P51')
  })

  it('never returns undefined for any integer 0-200', () => {
    for (let w = 0; w <= 200; w++) {
      expect(getStage(w, stages)).toBeDefined()
    }
  })
})
