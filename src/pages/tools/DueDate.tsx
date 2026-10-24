import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { db, type BabyProfile } from '../../db/db'
import { BackHeader, Disclaimer, SectionLabel } from '../../components/ui'
import { formatLongDate, fromInputDate, inputCls, primaryBtn, toInputDate } from '../../components/uiHelpers'
import { addDays } from '../../utils/age'
import { dueDateFromConception, dueDateFromLastPeriod, gestationalAge } from '../../utils/pregnancy'
import { showToast } from '../../utils/toast'
import { confirmDialog } from '../../utils/overlay'

const MILESTONES = [
  { week: 12, label: 'Ecografía del 1.er trimestre' },
  { week: 20, label: 'Ecografía morfológica' },
  { week: 24, label: 'Viabilidad · test de O\'Sullivan (24-28)' },
  { week: 28, label: 'Vacuna tosferina · inicio 3.er trimestre' },
  { week: 34, label: 'Ecografía 3.er trimestre · bolsa del hospital' },
  { week: 37, label: 'Embarazo a término' },
  { week: 40, label: 'Fecha probable de parto' },
]

export default function DueDate() {
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  if (isLoading || !profile) return null
  return <DueDateForm profile={profile} currentWeek={currentWeek} />
}

function DueDateForm({ profile, currentWeek }: { profile: BabyProfile; currentWeek: number }) {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'fur' | 'conception'>('fur')
  const [dateStr, setDateStr] = useState(profile.lastPeriod ? toInputDate(profile.lastPeriod) : '')
  const [cycle, setCycle] = useState(String(profile.cycleLength ?? 28))

  const base = dateStr ? fromInputDate(dateStr) : null
  const cycleLen = Math.min(45, Math.max(21, parseInt(cycle, 10) || 28))
  const due = base ? (mode === 'fur' ? dueDateFromLastPeriod(base, cycleLen) : dueDateFromConception(base)) : null
  const ga = due ? gestationalAge(due) : null

  async function apply() {
    if (!profile.id || !due) return
    const ok = await confirmDialog(profile.phase === 'trying'
      ? { title: '¡Enhorabuena! 🎉', message: `Pasamos a modo embarazo con fecha probable ${formatLongDate(due)}.`, confirmLabel: 'Empezar el embarazo' }
      : { title: 'Cambiar fecha probable', message: `La nueva fecha de ${profile.name} será ${formatLongDate(due)}.`, confirmLabel: 'Cambiar fecha' })
    if (!ok) return
    await db.profiles.update(profile.id, {
      birthDate: due,
      phase: 'expecting',
      ...(mode === 'fur' ? { lastPeriod: base!, cycleLength: cycleLen } : {}),
    })
    showToast('Fecha actualizada')
    navigate('/')
  }

  return (
    <div className="pb-24">
      <BackHeader title="Fecha probable de parto" subtitle="Calcula semanas de embarazo y fechas clave" />

      <div className="px-5 mb-5">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {([['fur', 'Última regla'], ['conception', 'Concepción']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setMode(k)}
              className={`flex-1 text-sm py-2 rounded-lg ${mode === k ? 'bg-white shadow-sm font-semibold text-gray-900' : 'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              {mode === 'fur' ? 'Primer día de la última regla' : 'Fecha de concepción / transferencia'}
            </label>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} className={inputCls} />
          </div>
          {mode === 'fur' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Duración habitual del ciclo (días)</label>
              <input type="number" inputMode="numeric" value={cycle} onChange={e => setCycle(e.target.value)} className={inputCls} />
            </div>
          )}
        </div>
      </div>

      {due && ga && (
        <>
          <div className="px-5 mb-5">
            <div className="bg-tinta-600 text-white rounded-2xl p-5">
              <p className="text-xs uppercase tracking-widest text-tinta-200 font-semibold">Fecha probable</p>
              <p className="text-2xl font-bold mt-1 first-letter:uppercase">{formatLongDate(due)}</p>
              {ga.weeks >= 0 && ga.weeks <= 42 && (
                <p className="text-sm text-tinta-100 mt-2">Hoy: semana {ga.weeks} + {ga.days} días</p>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-2 leading-relaxed">
              La ecografía del 1.er trimestre puede ajustar esta fecha: si os dan otra, usad la de la ecografía.
            </p>
          </div>

          <div className="px-5 mb-5">
            <SectionLabel>Fechas clave</SectionLabel>
            <ul className="space-y-1.5">
              {MILESTONES.map(m => {
                const d = addDays(due, (m.week - 40) * 7)
                const past = d < new Date()
                return (
                  <li key={m.week} className={`bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex justify-between gap-3 text-sm ${past ? 'opacity-50' : ''}`}>
                    <span className="text-gray-800"><span className="text-gray-500 mr-2">S{m.week}</span>{m.label}</span>
                    <span className="text-gray-500 shrink-0">{d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                  </li>
                )
              })}
            </ul>
          </div>

          {profile && (profile.phase === 'trying' || currentWeek < 0) && (
            <div className="px-5">
              <button onClick={apply} className={primaryBtn}>
                {profile.phase === 'trying' ? '¡Positivo! Empezar modo embarazo' : `Usar como fecha de ${profile.name}`}
              </button>
            </div>
          )}
        </>
      )}
      <Disclaimer />
    </div>
  )
}
