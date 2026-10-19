import vaccinesData from '../data/vaccines.json'
import { addDays } from './age'

export interface Vaccine {
  name: string
  ageInDays: number
  description: string
  important: boolean
}

export const VACCINES = vaccinesData as Vaccine[]
export const VACCINE_LIST_ID = 'vacunas'

export function vaccineId(v: Vaccine): string {
  return `${v.ageInDays}-${v.name}`
}

export function vaccineDate(birthDate: Date, v: Vaccine): Date {
  return addDays(birthDate, v.ageInDays)
}

/** Próxima vacuna no marcada en los próximos `days` días. */
export function nextVaccineAlert(birthDate: Date, doneIds: Set<string>, days = 7): { name: string; daysUntil: number } | null {
  const today = addDays(new Date(), 0)
  const limit = addDays(today, days)
  for (const v of VACCINES) {
    if (doneIds.has(vaccineId(v))) continue
    const d = vaccineDate(birthDate, v)
    if (d >= today && d <= limit) {
      return { name: v.name, daysUntil: Math.round((+d - +today) / 86_400_000) }
    }
  }
  return null
}
