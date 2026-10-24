import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { useListChecks } from '../../hooks/useChecks'
import { db, type BabyProfile, type CareLog } from '../../db/db'
import { BackHeader } from '../../components/ui'
import { inputCls } from '../../components/uiHelpers'
import { Icon } from '../../components/Icon'
import { addDays, formatAge, formatDuration, formatTime, startOfDay } from '../../utils/age'
import { classify } from '../../data/whoPercentiles'
import { MILESTONE_LIST_ID, currentMilestoneGroup } from '../../data/milestones'
import { FOOD_GROUPS, FOOD_LIST_ID } from '../../data/foods'
import { VACCINES, VACCINE_LIST_ID, vaccineDate, vaccineId } from '../../utils/vaccines'
import { ageInMonths } from '../../utils/age'
import { toast } from '../../utils/overlay'

const DAYS = 7

function questionsKey(pid: number) {
  return `tatus_preguntas_${pid}`
}

function dayStats(logs: CareLog[], day: Date) {
  const end = addDays(day, 1)
  const d = logs.filter(l => new Date(l.start) >= day && new Date(l.start) < end)
  const dur = (l: CareLog) => (l.end ? +new Date(l.end) : +new Date(l.start)) - +new Date(l.start)
  return {
    feeds: d.filter(l => l.type === 'breast' || l.type === 'bottle').length,
    ml: d.filter(l => l.type === 'bottle').reduce((s, l) => s + (l.amountMl ?? 0), 0),
    breastMs: d.filter(l => l.type === 'breast').reduce((s, l) => s + dur(l), 0),
    wet: d.filter(l => l.type === 'diaper' && l.diaper !== 'dirty').length,
    dirty: d.filter(l => l.type === 'diaper' && l.diaper !== 'wet').length,
    sleepMs: d.filter(l => l.type === 'sleep').reduce((s, l) => s + dur(l), 0),
  }
}

export default function Summary() {
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  if (isLoading || !profile) return null
  return <SummaryView key={profile.id} profile={profile} currentWeek={currentWeek} />
}

function SummaryView({ profile, currentWeek }: { profile: BabyProfile; currentWeek: number }) {
  const milestones = useListChecks(profile?.id, MILESTONE_LIST_ID)
  const foods = useListChecks(profile?.id, FOOD_LIST_ID)
  const vaccines = useListChecks(profile?.id, VACCINE_LIST_ID)
  const [questions, setQuestions] = useState(() => {
    try { return profile?.id ? localStorage.getItem(questionsKey(profile.id)) ?? '' : '' } catch { return '' }
  })

  const data = useLiveQuery(async () => {
    if (!profile?.id) return null
    const since = addDays(startOfDay(new Date()), -DAYS + 1)
    const logs = (await db.careLogs.where('profileId').equals(profile.id).toArray()).filter(l => new Date(l.start) >= since)
    const growth = (await db.growthRecords.toArray()).filter(r => r.profileId === profile.id).sort((a, b) => b.week - a.week)
    return { logs, growth, since }
  }, [profile?.id])

  if (!data) return null
  const pid = profile.id!
  const born = profile.phase !== 'trying' && currentWeek >= 0
  const m = profile.medical ?? {}
  const days = Array.from({ length: DAYS }, (_, i) => addDays(startOfDay(new Date()), -i))
  const meds = data.logs.filter(l => l.type === 'med').sort((a, b) => +new Date(b.start) - +new Date(a.start))
  const last = data.growth[0]
  const group = born ? currentMilestoneGroup(ageInMonths(profile.birthDate)) : undefined
  const pendingMilestones = group?.items.filter(i => !milestones?.has(i.id)) ?? []
  const reactions = [...(foods?.entries() ?? [])].filter(([, c]) => c.note)
    .map(([id, c]) => `${FOOD_GROUPS.flatMap(g => g.items).find(i => i.id === id)?.name}: ${c.note}`)
  const today = startOfDay(new Date())
  const overdueVaccines = born
    ? VACCINES.filter(v => !vaccines?.has(vaccineId(v)) && vaccineDate(profile.birthDate, v) < today && v.important)
    : []

  function saveQuestions(v: string) {
    setQuestions(v)
    try { localStorage.setItem(questionsKey(pid), v) } catch { /* sin almacenamiento */ }
  }

  function asText(): string {
    const lines = [
      `${profile.name} · ${born ? formatAge(profile.birthDate) : ''} · ${new Date().toLocaleDateString('es-ES')}`,
      m.allergies ? `Alergias: ${m.allergies}` : '',
      m.medications ? `Medicación: ${m.medications}` : '',
      last ? `Última medida (sem. ${last.week}): ${[last.weightKg && `${last.weightKg} kg`, last.heightCm && `${last.heightCm} cm`, last.headCm && `PC ${last.headCm} cm`].filter(Boolean).join(', ')}` : '',
      '',
      'Últimos 7 días:',
      ...days.map(d => {
        const s = dayStats(data!.logs, d)
        return `${d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}: ${s.feeds} tomas${s.ml ? `, ${s.ml} ml` : ''}${s.breastMs ? `, pecho ${formatDuration(s.breastMs)}` : ''}; pañales ${s.wet} pis/${s.dirty} caca; sueño ${s.sleepMs ? formatDuration(s.sleepMs) : '—'}`
      }),
      meds.length ? `\nMedicinas: ${meds.map(l => `${l.medName} ${formatTime(l.start)} ${new Date(l.start).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`).join('; ')}` : '',
      reactions.length ? `\nReacciones a alimentos: ${reactions.join('; ')}` : '',
      questions ? `\nPreguntas:\n${questions}` : '',
    ]
    return lines.filter(l => l !== '').join('\n')
  }

  async function share() {
    const text = asText()
    try {
      if (navigator.share) await navigator.share({ title: `Resumen de ${profile.name}`, text })
      else { await navigator.clipboard.writeText(text); toast('Resumen copiado') }
    } catch { /* cancelado */ }
  }

  return (
    <div className="pb-24 print:pb-0">
      <div className="print:hidden"><BackHeader title="Resumen para el pediatra" subtitle="Enséñalo en la consulta o compártelo" /></div>
      <div className="hidden print:block px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold">Resumen de {profile.name}</h1>
      </div>

      <div className="px-5 mb-5 flex gap-2 print:hidden">
        <button onClick={() => window.print()} className="flex-1 bg-tinta-600 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2">
          <Icon name="download" className="w-4 h-4" /> PDF / Imprimir
        </button>
        <button onClick={share} className="flex-1 bg-white border border-gray-200 text-gray-800 rounded-xl py-3 text-sm font-semibold">Compartir texto</button>
      </div>

      <section className="px-5 mb-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm space-y-1">
          <p className="text-base font-bold text-gray-900">{profile.name}{born ? ` · ${formatAge(profile.birthDate)}` : ''}</p>
          <p className="text-gray-600">Nacimiento: {new Date(profile.birthDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {m.allergies && <p className="text-gray-900"><strong>Alergias:</strong> {m.allergies}</p>}
          {m.medications && <p className="text-gray-900"><strong>Medicación:</strong> {m.medications}</p>}
          {m.conditions && <p className="text-gray-900"><strong>Antecedentes:</strong> {m.conditions}</p>}
          {last && (
            <div className="pt-2 mt-2 border-t border-gray-100">
              <p className="font-semibold text-gray-900">Última medida · semana {last.week}</p>
              {last.weightKg && <p>{last.weightKg} kg {profile.sex && <span className="text-gray-500">({classify('weight', profile.sex, last.week, last.weightKg) || 'sin referencia'})</span>}</p>}
              {last.heightCm && <p>{last.heightCm} cm {profile.sex && <span className="text-gray-500">({classify('height', profile.sex, last.week, last.heightCm) || 'sin referencia'})</span>}</p>}
              {last.headCm && <p>PC {last.headCm} cm {profile.sex && <span className="text-gray-500">({classify('head', profile.sex, last.week, last.headCm) || 'sin referencia'})</span>}</p>}
            </div>
          )}
        </div>
      </section>

      <section className="px-5 mb-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Últimos 7 días</p>
        <div className="bg-white border border-gray-100 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-3 py-2 font-medium">Día</th>
                <th className="px-2 py-2 font-medium">Tomas</th>
                <th className="px-2 py-2 font-medium">Pañales</th>
                <th className="px-2 py-2 font-medium">Sueño</th>
              </tr>
            </thead>
            <tbody>
              {days.map(d => {
                const s = dayStats(data.logs, d)
                return (
                  <tr key={+d} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 capitalize text-gray-700 whitespace-nowrap">{d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })}</td>
                    <td className="px-2 py-2 text-gray-900">{s.feeds}{s.ml ? <span className="text-gray-500"> · {s.ml} ml</span> : null}{s.breastMs ? <span className="text-gray-500"> · {formatDuration(s.breastMs)}</span> : null}</td>
                    <td className="px-2 py-2 text-gray-900">{s.wet}/{s.dirty}</td>
                    <td className="px-2 py-2 text-gray-900">{s.sleepMs ? formatDuration(s.sleepMs) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-500 mt-1.5">Pañales: pis/caca. Solo cuenta lo apuntado en el registro.</p>
      </section>

      {(meds.length > 0 || reactions.length > 0 || overdueVaccines.length > 0 || pendingMilestones.length > 0) && (
        <section className="px-5 mb-5 space-y-3">
          {meds.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm">
              <p className="font-semibold text-gray-900 mb-1">Medicinas esta semana</p>
              {meds.map(l => <p key={l.id} className="text-gray-700">{l.medName}{l.amountMl ? ` ${l.amountMl} ml` : ''} · {new Date(l.start).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })} {formatTime(l.start)}</p>)}
            </div>
          )}
          {reactions.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm">
              <p className="font-semibold text-gray-900 mb-1">Reacciones a alimentos</p>
              {reactions.map(r => <p key={r} className="text-gray-700">{r}</p>)}
            </div>
          )}
          {overdueVaccines.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm">
              <p className="font-semibold text-gray-900 mb-1">Vacunas sin marcar como puestas</p>
              {overdueVaccines.map(v => <p key={vaccineId(v)} className="text-gray-700">{v.name}</p>)}
            </div>
          )}
          {group && pendingMilestones.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm">
              <p className="font-semibold text-gray-900 mb-1">Hitos de los {group.label} aún sin marcar</p>
              {pendingMilestones.map(i => <p key={i.id} className="text-gray-700">{i.text}</p>)}
            </div>
          )}
        </section>
      )}

      <section className="px-5">
        <label htmlFor="preguntas" className="block text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Preguntas para la consulta</label>
        <textarea id="preguntas" rows={5} value={questions} onChange={e => saveQuestions(e.target.value)}
          placeholder="Apunta aquí las dudas según te surjan…" className={`${inputCls} text-base print:border-0`} />
      </section>
    </div>
  )
}
