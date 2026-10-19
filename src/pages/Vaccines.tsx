import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db } from '../db/db'
import { BackHeader } from '../components/ui'
import { checkKey } from '../data/checklists'
import { VACCINES, VACCINE_LIST_ID, vaccineDate, vaccineId, type Vaccine } from '../utils/vaccines'
import { startOfDay } from '../utils/age'

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Vaccines() {
  const { profile, isLoading } = useCurrentProfile()

  const done = useLiveQuery(async () => {
    if (!profile?.id) return new Set<string>()
    const rows = await db.checks.where('profileId').equals(profile.id).toArray()
    return new Set(rows.filter(r => r.done).map(r => r.key))
  }, [profile?.id])

  if (isLoading || !profile) return null
  const pid = profile.id!
  const isDone = (v: Vaccine) => done?.has(checkKey(pid, VACCINE_LIST_ID, vaccineId(v))) ?? false

  async function toggle(v: Vaccine) {
    const key = checkKey(pid, VACCINE_LIST_ID, vaccineId(v))
    await db.checks.put({ key, profileId: pid, done: !isDone(v) })
  }

  const today = startOfDay(new Date())
  const withDates = VACCINES
    .map(v => ({ v, date: vaccineDate(profile.birthDate, v) }))
    .sort((a, b) => +a.date - +b.date)

  const pending = withDates.filter(x => !isDone(x.v) && x.date < today)
  const upcoming = withDates.filter(x => !isDone(x.v) && x.date >= today)
  const completed = withDates.filter(x => isDone(x.v))

  function renderRow(v: Vaccine, date: Date, highlight = false) {
    const checked = isDone(v)
    return (
      <li key={vaccineId(v)} className={`rounded-2xl p-4 flex items-start gap-3 ${highlight ? 'bg-blue-50 border border-blue-100' : 'bg-white border border-gray-100'} ${checked ? 'opacity-60' : ''}`}>
        <button onClick={() => toggle(v)} aria-label={checked ? 'Marcar como pendiente' : 'Marcar como puesta'}
          className={`mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center text-xs ${checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 bg-white'}`}>
          {checked ? '✓' : ''}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${highlight ? 'text-blue-900' : 'text-gray-800'}`}>
            {v.name}{v.important && <span className="ml-1.5 text-xs text-blue-500">●</span>}
          </p>
          <p className={`text-xs mt-0.5 ${highlight ? 'text-blue-700' : 'text-gray-500'}`}>{v.description}</p>
        </div>
        <p className={`text-xs font-medium shrink-0 text-right ${highlight ? 'text-blue-600' : 'text-gray-400'}`}>{formatDate(date)}</p>
      </li>
    )
  }

  return (
    <div className="pb-24">
      <BackHeader title="Vacunas" subtitle={`Calendario orientativo 2026 · ${profile.name}`} />
      <p className="px-5 text-xs text-gray-400 mb-5 leading-relaxed">
        Toca el círculo cuando se la pongan. Las fechas exactas y algunas vacunas varían según tu comunidad autónoma: tu centro de salud te dará la cita. ● = financiada en el calendario común.
      </p>

      {pending.length > 0 && (
        <section className="mb-6">
          <p className="px-5 text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3">¿Ya puesta? Confírmalo</p>
          <ul className="space-y-2 px-5">
            {pending.map(x => renderRow(x.v, x.date))}
          </ul>
        </section>
      )}

      {upcoming.length > 0 && (
        <section className="mb-6">
          <p className="px-5 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Próximas</p>
          <ul className="space-y-2 px-5">
            {upcoming.map((x, i) => renderRow(x.v, x.date, i < 3))}
          </ul>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <p className="px-5 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Puestas</p>
          <ul className="space-y-2 px-5">
            {completed.map(x => renderRow(x.v, x.date))}
          </ul>
        </section>
      )}

      <p className="px-5 text-xs text-gray-400 text-center leading-relaxed mt-6">
        Las vacunas de la gripe y del VRS dependen de la temporada. Consulta el calendario oficial de tu comunidad y de la AEP.
      </p>
    </div>
  )
}
