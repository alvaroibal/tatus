import prenatalData from '../data/prenatal_stages.json'

export interface PrenatalStage {
  week: number
  babySize: string
  babySizeCm: number
  babyWeightG: number
  development: string[]
  fatherTasks: string[]
  shopping: string[]
  partnerTips: string[]
}

const stages = prenatalData as PrenatalStage[]

export function getPrenatalStage(pregnancyWeek: number): PrenatalStage {
  const clamped = Math.max(1, Math.min(40, pregnancyWeek))
  return stages.find(s => s.week === clamped) ?? stages[stages.length - 1]
}
