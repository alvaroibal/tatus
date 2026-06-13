const MS_PER_DAY = 86_400_000
const DAYS_PER_WEEK = 7

/**
 * Returns the chronological week since birth (0-indexed).
 * Negative → before-birth mode.
 *
 * DST note: Math.round(days) absorbs the ±1h from Spain's clock change
 * (last Sunday of March/October) so the week anniversary is always correct.
 */
export function calculateWeek(birthDate: Date): number {
  const birthMidnight = new Date(birthDate)
  birthMidnight.setHours(0, 0, 0, 0)
  const todayMidnight = new Date()
  todayMidnight.setHours(0, 0, 0, 0)
  const days = Math.round(
    (todayMidnight.getTime() - birthMidnight.getTime()) / MS_PER_DAY
  )
  return Math.floor(days / DAYS_PER_WEEK)
}
