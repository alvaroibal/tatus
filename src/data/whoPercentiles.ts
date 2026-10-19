/**
 * Referencias aproximadas de los Patrones de Crecimiento Infantil de la OMS (2006),
 * percentiles 3, 50 y 97 por mes de edad. Uso orientativo: el pediatra usa las tablas completas.
 */
type Row = [month: number, p3: number, p50: number, p97: number]

const WEIGHT_BOY: Row[] = [
  [0, 2.5, 3.3, 4.3], [1, 3.4, 4.5, 5.8], [2, 4.4, 5.6, 7.1], [3, 5.1, 6.4, 8.0],
  [4, 5.6, 7.0, 8.7], [5, 6.1, 7.5, 9.3], [6, 6.4, 7.9, 9.8], [7, 6.7, 8.3, 10.3],
  [8, 7.0, 8.6, 10.7], [9, 7.2, 8.9, 11.0], [10, 7.5, 9.2, 11.4], [11, 7.7, 9.4, 11.7],
  [12, 7.8, 9.6, 12.0], [15, 8.4, 10.3, 12.8], [18, 8.9, 10.9, 13.7], [21, 9.4, 11.5, 14.5],
  [24, 9.8, 12.2, 15.3], [30, 10.7, 13.3, 16.9], [36, 11.4, 14.3, 18.3],
]
const WEIGHT_GIRL: Row[] = [
  [0, 2.4, 3.2, 4.2], [1, 3.2, 4.2, 5.5], [2, 4.0, 5.1, 6.6], [3, 4.6, 5.8, 7.5],
  [4, 5.1, 6.4, 8.2], [5, 5.5, 6.9, 8.8], [6, 5.8, 7.3, 9.3], [7, 6.1, 7.6, 9.8],
  [8, 6.3, 7.9, 10.2], [9, 6.6, 8.2, 10.5], [10, 6.8, 8.5, 10.9], [11, 7.0, 8.7, 11.2],
  [12, 7.1, 8.9, 11.5], [15, 7.7, 9.6, 12.4], [18, 8.2, 10.2, 13.2], [21, 8.8, 10.9, 14.0],
  [24, 9.2, 11.5, 14.8], [30, 10.1, 12.7, 16.5], [36, 11.0, 13.9, 18.1],
]
const HEIGHT_BOY: Row[] = [
  [0, 46.3, 49.9, 53.4], [1, 51.1, 54.7, 58.4], [2, 54.7, 58.4, 62.2], [3, 57.6, 61.4, 65.3],
  [4, 60.0, 63.9, 67.8], [5, 61.9, 65.9, 69.9], [6, 63.6, 67.6, 71.6], [7, 65.1, 69.2, 73.2],
  [8, 66.5, 70.6, 74.7], [9, 67.7, 72.0, 76.2], [10, 69.0, 73.3, 77.6], [11, 70.2, 74.5, 78.9],
  [12, 71.3, 75.7, 80.2], [15, 74.4, 79.1, 83.9], [18, 77.2, 82.3, 87.5], [21, 79.7, 85.1, 90.6],
  [24, 82.1, 87.8, 93.6], [30, 85.5, 91.9, 98.4], [36, 89.1, 96.1, 103.1],
]
const HEIGHT_GIRL: Row[] = [
  [0, 45.6, 49.1, 52.7], [1, 50.0, 53.7, 57.4], [2, 53.2, 57.1, 60.9], [3, 55.8, 59.8, 63.8],
  [4, 58.0, 62.1, 66.2], [5, 59.9, 64.0, 68.2], [6, 61.5, 65.7, 70.0], [7, 62.9, 67.3, 71.6],
  [8, 64.3, 68.7, 73.2], [9, 65.6, 70.1, 74.7], [10, 66.8, 71.5, 76.1], [11, 68.0, 72.8, 77.5],
  [12, 69.2, 74.0, 78.9], [15, 72.4, 77.5, 82.7], [18, 75.2, 80.7, 86.2], [21, 77.9, 83.7, 89.4],
  [24, 80.3, 86.4, 92.5], [30, 84.0, 90.7, 97.3], [36, 87.9, 95.1, 102.7],
]

export const WEEKS_PER_MONTH = 4.345

export type Metric = 'weight' | 'height'

export function referenceTable(metric: Metric, sex: 'boy' | 'girl'): Row[] {
  if (metric === 'weight') return sex === 'boy' ? WEIGHT_BOY : WEIGHT_GIRL
  return sex === 'boy' ? HEIGHT_BOY : HEIGHT_GIRL
}

function interpolate(rows: Row[], month: number): [number, number, number] {
  if (month <= rows[0][0]) return [rows[0][1], rows[0][2], rows[0][3]]
  for (let i = 1; i < rows.length; i++) {
    const [m1, a1, b1, c1] = rows[i]
    if (month <= m1) {
      const [m0, a0, b0, c0] = rows[i - 1]
      const t = (month - m0) / (m1 - m0)
      return [a0 + (a1 - a0) * t, b0 + (b1 - b0) * t, c0 + (c1 - c0) * t]
    }
  }
  const last = rows[rows.length - 1]
  return [last[1], last[2], last[3]]
}

/** Clasificación sencilla frente a P3 / P50 / P97. */
export function classify(metric: Metric, sex: 'boy' | 'girl', week: number, value: number): string {
  const month = week / WEEKS_PER_MONTH
  if (month > 36) return ''
  const [p3, p50, p97] = interpolate(referenceTable(metric, sex), month)
  if (value < p3) return 'por debajo del P3 — coméntalo con el pediatra'
  if (value > p97) return 'por encima del P97 — coméntalo con el pediatra'
  if (Math.abs(value - p50) / p50 < 0.04) return 'cerca de la media (P50)'
  return value < p50 ? 'entre P3 y P50' : 'entre P50 y P97'
}

/** Puntos de referencia para la gráfica, en semanas. */
export function referenceSeries(metric: Metric, sex: 'boy' | 'girl', maxWeek: number) {
  return referenceTable(metric, sex)
    .map(([m, p3, p50, p97]) => ({ semana: Math.round(m * WEEKS_PER_MONTH), p3, p50, p97 }))
    .filter(r => r.semana <= maxWeek + 8)
}
