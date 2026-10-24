import type { CareLog } from '../db/db'

/** Intervalos de los prospectos (AEMPS) para los dos antitérmicos habituales. */
export const MED_RULES = [
  { id: 'paracetamol', label: 'Paracetamol', match: /paracet|apiretal|febrectal|termalgin/i, minHours: 6, maxPerDay: 4 },
  { id: 'ibuprofeno', label: 'Ibuprofeno', match: /ibupro|dalsy|junifen|ibuprox/i, minHours: 8, maxPerDay: 3 },
] as const

export interface DoseStatus {
  label: string
  last: Date
  dosesLast24h: number
  maxPerDay: number
  nextAllowed: Date
  canGiveNow: boolean
}

const H = 3_600_000

/** Para cada antitérmico dado en las últimas 24 h: cuándo se puede dar la siguiente dosis. */
export function doseStatus(logs: CareLog[], now = new Date()): DoseStatus[] {
  const out: DoseStatus[] = []
  for (const rule of MED_RULES) {
    const doses = logs
      .filter(l => l.type === 'med' && l.medName && rule.match.test(l.medName))
      .map(l => new Date(l.start))
      .filter(d => +now - +d < 24 * H && +d <= +now + 60_000)
      .sort((a, b) => +a - +b)
    if (doses.length === 0) continue
    const last = doses[doses.length - 1]
    let next = +last + rule.minHours * H
    if (doses.length >= rule.maxPerDay) {
      // La más antigua de la ventana debe salir de las 24 h
      next = Math.max(next, +doses[doses.length - rule.maxPerDay] + 24 * H)
    }
    out.push({
      label: rule.label,
      last,
      dosesLast24h: doses.length,
      maxPerDay: rule.maxPerDay,
      nextAllowed: new Date(next),
      canGiveNow: +now >= next,
    })
  }
  return out
}
