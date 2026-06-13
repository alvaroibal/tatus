import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { calculateWeek } from '../calculateWeek'

const DAY = 86_400_000
const WEEK = 7 * DAY

function mockToday(date: Date) {
  vi.setSystemTime(date)
}

describe('calculateWeek', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('returns 0 for birth day (today)', () => {
    const birth = new Date('2026-06-01')
    mockToday(new Date('2026-06-01'))
    expect(calculateWeek(birth)).toBe(0)
  })

  it('returns negative for future birthDate (before-birth)', () => {
    const birth = new Date('2026-12-01')
    mockToday(new Date('2026-06-01'))
    expect(calculateWeek(birth)).toBeLessThan(0)
  })

  it('returns correct week across DST crossover (Spain: last Sunday March)', () => {
    // Spain springs forward on 2027-03-28 at 02:00
    // Birth: 2027-03-21 (week boundary is 2027-03-28 — same day as DST change)
    const birth = new Date('2027-03-21')
    mockToday(new Date('2027-03-28'))  // exact anniversary day, post-DST
    expect(calculateWeek(birth)).toBe(1)
  })

  it('returns week 1 exactly 7 days after birth', () => {
    const birth = new Date('2026-06-01')
    mockToday(new Date(new Date('2026-06-01').getTime() + WEEK))
    expect(calculateWeek(birth)).toBe(1)
  })

  it('returns week 0 on day 6 (one day before first boundary)', () => {
    const birth = new Date('2026-06-01')
    mockToday(new Date(new Date('2026-06-01').getTime() + 6 * DAY))
    expect(calculateWeek(birth)).toBe(0)
  })
})
