import type { MedDose, MedPlan } from '../db/db'
import type { IcsEvent } from './ics'

const MIN = 60_000
const H = 60 * MIN
const SOON_MIN = 30
const LATE_MIN = 60
/** Sin duración fijada, el calendario se rellena con esta ventana. */
const OPEN_ENDED_CALENDAR_DAYS = 7
const MAX_CALENDAR_EVENTS = 120

export type MedLevel = 'ok' | 'soon' | 'due' | 'late' | 'finished' | 'paused'

export interface MedStatus {
  plan: MedPlan
  level: MedLevel
  last?: Date
  nextDue?: Date
  endAt?: Date
  takenLast24h: number
}

export const MED_PRESETS: { name: string; everyHours: number; days?: number; dose?: string }[] = [
  { name: 'Ibuprofeno 600 mg', everyHours: 8, dose: '1 comprimido' },
  { name: 'Paracetamol 1 g', everyHours: 8, dose: '1 comprimido' },
  { name: 'Hierro', everyHours: 24, dose: '1 comprimido' },
  { name: 'Heparina (inyección)', everyHours: 24, dose: '1 inyección' },
  { name: 'Antibiótico', everyHours: 8, days: 7 },
  { name: 'Yodo / vitaminas', everyHours: 24, dose: '1 comprimido' },
  { name: 'Laxante', everyHours: 24 },
]

export const EVERY_HOURS_OPTIONS = [4, 6, 8, 12, 24]

export function planEnd(plan: MedPlan): Date | undefined {
  return plan.days ? new Date(+new Date(plan.startAt) + plan.days * 24 * H) : undefined
}

export function dosesOf(plan: MedPlan, doses: MedDose[]): Date[] {
  return doses
    .filter(d => d.planUid === plan.uid)
    .map(d => new Date(d.takenAt))
    .sort((a, b) => +a - +b)
}

/** Cuándo toca la siguiente toma y cómo de urgente es. */
export function medStatus(plan: MedPlan, doses: MedDose[], now = new Date()): MedStatus {
  const taken = dosesOf(plan, doses).filter(d => +d <= +now + MIN)
  const last = taken[taken.length - 1]
  const endAt = planEnd(plan)
  const takenLast24h = taken.filter(d => +now - +d < 24 * H).length
  const base = { plan, last, endAt, takenLast24h }

  if (!plan.active) return { ...base, level: 'paused' }
  const nextDue = last ? new Date(+last + plan.everyHours * H) : new Date(plan.startAt)
  if (endAt && +nextDue >= +endAt) return { ...base, level: 'finished' }

  const diff = +now - +nextDue
  const level: MedLevel = diff >= LATE_MIN * MIN ? 'late'
    : diff >= 0 ? 'due'
      : diff >= -SOON_MIN * MIN ? 'soon'
        : 'ok'
  return { ...base, level, nextDue }
}

/** Avisa si se va a apuntar una toma bastante antes de lo pautado. */
export function tooEarly(status: MedStatus, at = new Date()): boolean {
  if (!status.last) return false
  return +at - +status.last < status.plan.everyHours * H * 0.75
}

/** Las tomas que quedan, como eventos de calendario con aviso a la hora. */
export function medCalendarEvents(status: MedStatus, who: string, now = new Date()): IcsEvent[] {
  const { plan } = status
  const from = status.nextDue ?? new Date(plan.startAt)
  const until = status.endAt ?? new Date(+now + OPEN_ENDED_CALENDAR_DAYS * 24 * H)
  const out: IcsEvent[] = []
  for (let t = +from; t < +until && out.length < MAX_CALENDAR_EVENTS; t += plan.everyHours * H) {
    out.push({
      uid: `med-${plan.uid}-${t}`,
      title: `💊 ${who}: ${plan.name}${plan.dose ? ` · ${plan.dose}` : ''}`,
      start: new Date(t),
      durationMin: 15,
      description: `Cada ${plan.everyHours} h. Apúntalo en Tatuś al tomarlo.${plan.notes ? `\n${plan.notes}` : ''}`,
      alarmMinutesBefore: 0,
    })
  }
  return out
}

/** Nombre de quien toma la medicación según quién usa este dispositivo. */
export function medOwnerLabel(role: 'papa' | 'mama' | undefined, partnerName: string | undefined): { title: string; who: string } {
  if (role === 'mama') return { title: 'Tu medicación', who: 'Tú' }
  const who = partnerName?.trim() || 'mamá'
  return { title: `Medicación de ${who}`, who }
}
