import type { CareLog } from '../db/db'

const MIN = 60_000
const H = 60 * MIN

/**
 * En las primeras semanas un recién nacido no debería pasar más de 3-4 h sin
 * comer (AEP / IHAN): a las 3 h ya toca, a las 4 h hay que despertarlo.
 * El intervalo se cuenta desde el INICIO de la toma anterior.
 */
export const FEED_DUE_H = 3
export const FEED_LATE_H = 4
const FEED_SOON_MIN = 30
/** Hasta qué edad (días) se avisa del intervalo entre tomas. */
export const FEED_WATCH_DAYS = 56

export type FeedLevel = 'none' | 'feeding' | 'ok' | 'soon' | 'due' | 'late'

export interface FeedStatus {
  level: FeedLevel
  last?: CareLog
  elapsedMs: number
  dueAt?: Date       // inicio de la última + 3 h
  lateAt?: Date      // inicio de la última + 4 h
}

export const isFeed = (l: CareLog) => l.type === 'breast' || l.type === 'bottle'

export function lastFeed(logs: CareLog[]): CareLog | undefined {
  let best: CareLog | undefined
  for (const l of logs) {
    if (!isFeed(l)) continue
    if (!best || +new Date(l.start) > +new Date(best.start)) best = l
  }
  return best
}

export function feedStatus(logs: CareLog[], now = new Date()): FeedStatus {
  const last = lastFeed(logs)
  if (!last) return { level: 'none', elapsedMs: 0 }
  const start = +new Date(last.start)
  const elapsedMs = Math.max(0, +now - start)
  const dueAt = new Date(start + FEED_DUE_H * H)
  const lateAt = new Date(start + FEED_LATE_H * H)
  const base = { last, elapsedMs, dueAt, lateAt }
  if (last.type === 'breast' && !last.end) return { ...base, level: 'feeding' }
  if (+now >= +lateAt) return { ...base, level: 'late' }
  if (+now >= +dueAt) return { ...base, level: 'due' }
  if (+now >= +dueAt - FEED_SOON_MIN * MIN) return { ...base, level: 'soon' }
  return { ...base, level: 'ok' }
}

/** Fracción (0-1) del camino hasta las 4 h, para la barra de progreso. */
export function feedProgress(s: FeedStatus): number {
  if (!s.last) return 0
  return Math.min(1, s.elapsedMs / (FEED_LATE_H * H))
}
