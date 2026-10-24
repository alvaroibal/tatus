/**
 * Exporta eventos a un .ics que el calendario del móvil importa con sus propios avisos.
 * Es la forma fiable de tener recordatorios sin servidor de notificaciones.
 */

export interface IcsEvent {
  uid: string
  title: string
  start: Date
  allDay?: boolean
  durationMin?: number
  description?: string
  alarmMinutesBefore?: number
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function day(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m => `\\${m}`)
}

export function buildIcs(events: IcsEvent[]): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tatus//ES', 'CALSCALE:GREGORIAN']
  for (const e of events) {
    lines.push('BEGIN:VEVENT', `UID:${e.uid}@tatus`, `DTSTAMP:${stamp(new Date())}`)
    if (e.allDay) {
      const next = new Date(e.start)
      next.setDate(next.getDate() + 1)
      lines.push(`DTSTART;VALUE=DATE:${day(e.start)}`, `DTEND;VALUE=DATE:${day(next)}`)
    } else {
      lines.push(`DTSTART:${stamp(e.start)}`, `DTEND:${stamp(new Date(+e.start + (e.durationMin ?? 60) * 60_000))}`)
    }
    lines.push(`SUMMARY:${esc(e.title)}`)
    if (e.description) lines.push(`DESCRIPTION:${esc(e.description)}`)
    if (e.alarmMinutesBefore !== undefined) {
      lines.push('BEGIN:VALARM', `TRIGGER:-PT${e.alarmMinutesBefore}M`, 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'END:VALARM')
    }
    lines.push('END:VEVENT')
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(filename: string, events: IcsEvent[]) {
  const url = URL.createObjectURL(new Blob([buildIcs(events)], { type: 'text/calendar' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
