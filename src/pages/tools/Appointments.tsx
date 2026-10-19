import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { db, type Appointment } from '../../db/db'
import { KIND_LABELS, SUGGESTED_CHECKUPS } from '../../data/checkups'
import { BackHeader, SectionLabel } from '../../components/ui'
import { fromInputDate, inputCls, primaryBtn, toInputDate } from '../../components/uiHelpers'
import { addDays, formatTime, startOfDay } from '../../utils/age'
import { showToast } from '../../utils/toast'

function fmt(d: Date) {
  return new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

interface Draft { title: string; date: string; time: string; kind: Appointment['kind']; notes: string }

const EMPTY: Draft = { title: '', date: toInputDate(new Date()), time: '10:00', kind: 'pediatra', notes: '' }

export default function Appointments() {
  const { profile, isLoading } = useCurrentProfile()
  const [draft, setDraft] = useState<Draft | null>(null)

  const appts = useLiveQuery(async () => {
    if (!profile?.id) return []
    const all = await db.appointments.where('profileId').equals(profile.id).toArray()
    return all.sort((a, b) => +new Date(a.date) - +new Date(b.date))
  }, [profile?.id])

  if (isLoading || !profile) return null

  const today = startOfDay(new Date())
  const upcoming = (appts ?? []).filter(a => !a.done && new Date(a.date) >= today)
  const past = (appts ?? []).filter(a => a.done || new Date(a.date) < today).reverse()

  const existingTitles = new Set((appts ?? []).map(a => a.title))
  const suggestions = profile.phase === 'trying' ? [] : SUGGESTED_CHECKUPS
    .map(s => ({ ...s, date: addDays(profile.birthDate, s.offsetDays) }))
    .filter(s => s.date >= addDays(today, -7) && !existingTitles.has(s.title))
    .slice(0, 4)

  async function save() {
    if (!draft || !draft.title.trim() || !draft.date) return
    const date = fromInputDate(draft.date)
    const [h, m] = draft.time.split(':').map(Number)
    date.setHours(h || 0, m || 0)
    try {
      await db.appointments.add({
        profileId: profile!.id!, date, title: draft.title.trim(), kind: draft.kind,
        notes: draft.notes.trim() || undefined, done: false,
      })
      showToast('Cita guardada')
      setDraft(null)
    } catch {
      showToast('No se pudo guardar.')
    }
  }

  async function toggleDone(a: Appointment) {
    await db.appointments.update(a.id!, { done: !a.done })
  }

  async function remove(a: Appointment) {
    if (confirm(`¿Borrar la cita "${a.title}"?`)) await db.appointments.delete(a.id!)
  }

  function exportIcs(a: Appointment) {
    const d = new Date(a.date)
    const stamp = (x: Date) => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const end = new Date(d.getTime() + 60 * 60_000)
    const ics = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tatus//ES', 'BEGIN:VEVENT',
      `UID:tatus-${a.id}@tatus`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(d)}`, `DTEND:${stamp(end)}`,
      `SUMMARY:${a.title} (${profile!.name})`, a.notes ? `DESCRIPTION:${a.notes.replace(/\n/g, '\\n')}` : '',
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${a.title}`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR',
    ].filter(Boolean).join('\r\n')
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `cita-${toInputDate(d)}.ics`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="pb-24">
      <BackHeader
        title="Citas"
        subtitle="Ecografías, pediatra, matrona, vacunas"
        right={!draft ? <button onClick={() => setDraft(EMPTY)} className="text-sm text-tinta-600 font-semibold">+ Nueva</button> : undefined}
      />

      {draft && (
        <div className="px-5 mb-5">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
            <input value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="Título (ej. Revisión 2 meses)" className={inputCls} autoFocus />
            <div className="flex gap-2">
              <input type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} className={inputCls} />
              <input type="time" value={draft.time} onChange={e => setDraft({ ...draft, time: e.target.value })} className={`${inputCls} w-28`} />
            </div>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(KIND_LABELS) as Appointment['kind'][]).map(k => (
                <button key={k} onClick={() => setDraft({ ...draft, kind: k })}
                  className={`text-xs rounded-full px-3 py-1.5 border ${draft.kind === k ? 'bg-tinta-50 border-tinta-200 text-tinta-700 font-semibold' : 'border-gray-200 text-gray-500'}`}>
                  {KIND_LABELS[k].emoji} {KIND_LABELS[k].label}
                </button>
              ))}
            </div>
            <textarea value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} rows={3} placeholder="Preguntas para la consulta, qué llevar…" className={inputCls} />
            <div className="flex gap-2">
              <button onClick={save} disabled={!draft.title.trim()} className={primaryBtn}>Guardar</button>
              <button onClick={() => setDraft(null)} className="px-4 text-sm text-gray-400">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {suggestions.length > 0 && !draft && (
        <section className="px-5 mb-6">
          <SectionLabel>Sugeridas para estas fechas</SectionLabel>
          <ul className="space-y-2">
            {suggestions.map(s => (
              <li key={s.id} className="border-2 border-dashed border-gray-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-lg">{KIND_LABELS[s.kind].emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{s.title}</p>
                  <p className="text-xs text-gray-400">hacia el {fmt(s.date)}</p>
                </div>
                <button
                  onClick={() => setDraft({ ...EMPTY, title: s.title, kind: s.kind, date: toInputDate(s.date) })}
                  className="text-xs text-tinta-600 font-semibold shrink-0"
                >
                  + Añadir
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-gray-400 mt-2">Fechas aproximadas: confirma el día con tu centro de salud.</p>
        </section>
      )}

      <section className="px-5 mb-6">
        <SectionLabel>Próximas</SectionLabel>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">No hay citas próximas.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map(a => (
              <li key={a.id} className="bg-white border border-gray-100 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-xl">{KIND_LABELS[a.kind].emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{a.title}</p>
                    <p className="text-xs text-tinta-600 capitalize mt-0.5">{fmt(a.date)} · {formatTime(a.date)}</p>
                    {a.notes && <p className="text-xs text-gray-500 mt-1.5 whitespace-pre-wrap">{a.notes}</p>}
                  </div>
                </div>
                <div className="flex gap-4 mt-3 pl-9 text-xs">
                  <button onClick={() => toggleDone(a)} className="text-green-600 font-medium">✓ Hecha</button>
                  <button onClick={() => exportIcs(a)} className="text-tinta-600">Añadir al calendario</button>
                  <button onClick={() => remove(a)} className="text-red-400 ml-auto">Borrar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section className="px-5">
          <SectionLabel>Pasadas</SectionLabel>
          <ul className="space-y-2">
            {past.map(a => (
              <li key={a.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3 opacity-60">
                <span className={a.done ? 'text-green-500' : 'text-gray-300'}>{a.done ? '✓' : '○'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700">{a.title}</p>
                  <p className="text-xs text-gray-400">{fmt(a.date)}</p>
                </div>
                <button onClick={() => remove(a)} className="text-gray-300 text-sm">✕</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
