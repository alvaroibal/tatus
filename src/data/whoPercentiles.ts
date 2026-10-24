/**
 * Percentiles exactos con el método LMS de la OMS:
 *   z = ((x / M)^L - 1) / (L · S)      valor = M · (1 + L·S·z)^(1/L)
 * Datos oficiales 0-24 meses en whoLms.ts. Por encima de 24 meses no se calcula.
 */
import { WHO_LMS, type LmsRow } from './whoLms'

export const WEEKS_PER_MONTH = 4.348  // 365,25 / 12 / 7
export const MAX_MONTH = 24

export type Metric = 'weight' | 'height' | 'head'

const Z_P3 = -1.8808
const Z_P97 = 1.8808

function lmsAt(metric: Metric, sex: 'boy' | 'girl', month: number): [number, number, number] | null {
  const rows: LmsRow[] = WHO_LMS[metric][sex]
  if (month < 0 || month > MAX_MONTH) return null
  const i = Math.min(rows.length - 2, Math.floor(month))
  const [m0, l0, mm0, s0] = rows[i]
  const [m1, l1, mm1, s1] = rows[i + 1]
  const t = (month - m0) / (m1 - m0)
  return [l0 + (l1 - l0) * t, mm0 + (mm1 - mm0) * t, s0 + (s1 - s0) * t]
}

function valueAtZ([L, M, S]: [number, number, number], z: number): number {
  return L === 0 ? M * Math.exp(S * z) : M * Math.pow(1 + L * S * z, 1 / L)
}

function zOf([L, M, S]: [number, number, number], x: number): number {
  return L === 0 ? Math.log(x / M) / S : (Math.pow(x / M, L) - 1) / (L * S)
}

/** Función de distribución normal estándar (Abramowitz-Stegun 26.2.17). */
function normCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z))
  const d = 0.3989423 * Math.exp((-z * z) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z > 0 ? 1 - p : p
}

/** Percentil (0-100) de una medida, o null si la edad está fuera de 0-24 meses. */
export function percentile(metric: Metric, sex: 'boy' | 'girl', week: number, value: number): number | null {
  const lms = lmsAt(metric, sex, week / WEEKS_PER_MONTH)
  if (!lms || !(value > 0)) return null
  return normCdf(zOf(lms, value)) * 100
}

export function formatPercentile(p: number): string {
  if (p < 1) return '<P1'
  if (p > 99) return '>P99'
  return `P${Math.round(p)}`
}

/** Texto corto para mostrar junto a la medida. */
export function classify(metric: Metric, sex: 'boy' | 'girl', week: number, value: number): string {
  const p = percentile(metric, sex, week, value)
  if (p === null) return ''
  const label = formatPercentile(p)
  if (p < 3) return `${label} — por debajo del P3, coméntalo con el pediatra`
  if (p > 97) return `${label} — por encima del P97, coméntalo con el pediatra`
  return label
}

/** Curvas P3 / P50 / P97 cada mes, en semanas, para la gráfica. */
export function referenceSeries(metric: Metric, sex: 'boy' | 'girl', maxWeek: number) {
  const out: { semana: number; p3: number; p50: number; p97: number }[] = []
  const lastMonth = Math.min(MAX_MONTH, Math.ceil(maxWeek / WEEKS_PER_MONTH) + 2)
  for (let m = 0; m <= lastMonth; m++) {
    const lms = lmsAt(metric, sex, m)!
    out.push({
      semana: Math.round(m * WEEKS_PER_MONTH),
      p3: valueAtZ(lms, Z_P3),
      p50: lms[1],
      p97: valueAtZ(lms, Z_P97),
    })
  }
  return out
}
