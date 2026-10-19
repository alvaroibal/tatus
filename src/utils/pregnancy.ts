import { addDays, daysBetween } from './age'

/** Regla de Naegele: FUR + 280 días. */
export function dueDateFromLastPeriod(lastPeriod: Date, cycleLength = 28): Date {
  return addDays(lastPeriod, 280 + (cycleLength - 28))
}

/** Desde la fecha de concepción: + 266 días. */
export function dueDateFromConception(conception: Date): Date {
  return addDays(conception, 266)
}

/** Semana y día de embarazo (gestacional, contada desde la FUR) para una FPP. */
export function gestationalAge(dueDate: Date, today = new Date()): { weeks: number; days: number } {
  const daysPregnant = 280 - daysBetween(today, dueDate)
  return { weeks: Math.floor(daysPregnant / 7), days: ((daysPregnant % 7) + 7) % 7 }
}

export interface FertileCycle {
  periodStart: Date
  fertileStart: Date
  ovulation: Date
  fertileEnd: Date
  nextPeriod: Date
}

/**
 * Ventana fértil estimada: la ovulación ocurre ~14 días antes de la siguiente regla;
 * los días fértiles son los 5 previos a la ovulación + el día siguiente.
 */
export function fertileCycles(lastPeriod: Date, cycleLength = 28, count = 3, today = new Date()): FertileCycle[] {
  const len = Math.min(45, Math.max(21, Math.round(cycleLength)))
  let start = addDays(lastPeriod, 0)
  // Avanza hasta el ciclo actual
  while (daysBetween(start, today) >= len) start = addDays(start, len)
  const out: FertileCycle[] = []
  for (let i = 0; i < count; i++) {
    const nextPeriod = addDays(start, len)
    const ovulation = addDays(nextPeriod, -14)
    out.push({
      periodStart: start,
      fertileStart: addDays(ovulation, -5),
      ovulation,
      fertileEnd: addDays(ovulation, 1),
      nextPeriod,
    })
    start = nextPeriod
  }
  return out
}
