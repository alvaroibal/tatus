export interface Stage {
  weekStart: number
  weekEnd: number
  physical: string[]
  mental: string[]
  emotional: string[]
  fatherTasks: string[]
}

/** Never returns undefined — triple fallback guarantees a Stage. */
export function getStage(week: number, stages: Stage[]): Stage {
  // 1. Exact range match
  const exact = stages.find(s => week >= s.weekStart && week <= s.weekEnd)
  if (exact) return exact
  // 2. Floor search: closest entry at or before week (handles mid-array gaps)
  const floor = [...stages].reverse().find(s => s.weekStart <= week)
  if (floor) return floor
  // 3. Last entry fallback (week > 51 or empty array edge case)
  return stages[stages.length - 1]
}
