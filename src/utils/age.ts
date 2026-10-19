const MS_PER_DAY = 86_400_000

export function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date, days: number): Date {
  const x = startOfDay(d)
  x.setDate(x.getDate() + days)
  return x
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY)
}

/** Meses cumplidos (calendario) desde el nacimiento. */
export function ageInMonths(birthDate: Date, today = new Date()): number {
  const b = startOfDay(birthDate)
  const t = startOfDay(today)
  let months = (t.getFullYear() - b.getFullYear()) * 12 + (t.getMonth() - b.getMonth())
  if (t.getDate() < b.getDate()) months--
  return Math.max(0, months)
}

/** "5 días", "3 semanas", "4 meses y 2 semanas", "1 año y 3 meses". */
export function formatAge(birthDate: Date, today = new Date()): string {
  const days = daysBetween(birthDate, today)
  if (days < 0) return ''
  if (days < 14) return days === 1 ? '1 día' : `${days} días`
  const months = ageInMonths(birthDate, today)
  if (months < 1) return `${Math.floor(days / 7)} semanas`
  if (months < 24) {
    const anniversary = new Date(startOfDay(birthDate))
    anniversary.setMonth(anniversary.getMonth() + months)
    const weeks = Math.floor(daysBetween(anniversary, today) / 7)
    const m = months === 1 ? '1 mes' : `${months} meses`
    return weeks > 0 ? `${m} y ${weeks === 1 ? '1 semana' : `${weeks} semanas`}` : m
  }
  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = years === 1 ? '1 año' : `${years} años`
  return rest > 0 ? `${y} y ${rest === 1 ? '1 mes' : `${rest} meses`}` : y
}

/** Etiqueta para una semana de vida guardada (diario, cartas…). */
export function weekOfLifeLabel(week: number): string {
  if (week < 0) return `Semana ${Math.max(1, 40 + week)} de embarazo`
  if (week < 52) return `Semana ${week} de vida`
  const months = Math.floor(week / 4.345)
  if (months < 24) return `${months} meses`
  const years = Math.floor(months / 12)
  const rest = months % 12
  return rest ? `${years} años y ${rest} meses` : `${years} años`
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60_000))
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return m ? `${h} h ${m} min` : `${h} h`
}

export function formatClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  const mm = String(Math.floor(s / 60)).padStart(2, '0')
  const ss = String(s % 60).padStart(2, '0')
  return `${mm}:${ss}`
}

export function timeAgo(d: Date, now = new Date()): string {
  const min = Math.round((now.getTime() - new Date(d).getTime()) / 60_000)
  if (min < 1) return 'ahora mismo'
  if (min < 60) return `hace ${min} min`
  return `hace ${formatDuration(min * 60_000)}`
}

export function formatTime(d: Date): string {
  return new Date(d).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
}
