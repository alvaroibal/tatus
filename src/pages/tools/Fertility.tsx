import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { db, type BabyProfile } from '../../db/db'
import { AlertBox, BackHeader, Disclaimer, SectionLabel } from '../../components/ui'
import { fromInputDate, inputCls, toInputDate } from '../../components/uiHelpers'
import { daysBetween } from '../../utils/age'
import { fertileCycles } from '../../utils/pregnancy'
import { showToast } from '../../utils/toast'

function fmt(d: Date) {
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function FertilitySummary({ lastPeriod, cycleLength }: { lastPeriod: Date; cycleLength: number }) {
  const [cycle] = fertileCycles(lastPeriod, cycleLength, 1)
  const today = new Date()
  const toFertile = daysBetween(today, cycle.fertileStart)
  const toPeriod = daysBetween(today, cycle.nextPeriod)
  let headline: string
  if (toFertile > 0) headline = `Días fértiles en ${toFertile} ${toFertile === 1 ? 'día' : 'días'}`
  else if (daysBetween(today, cycle.fertileEnd) >= 0) headline = 'Hoy estáis en la ventana fértil'
  else headline = toPeriod > 0 ? `Regla prevista en ${toPeriod} ${toPeriod === 1 ? 'día' : 'días'}` : 'Si no ha bajado la regla, haced un test'
  return (
    <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-rose-400">Este ciclo</p>
      <p className="text-lg font-bold text-rose-900 mt-1">{headline}</p>
      <p className="text-xs text-rose-700 mt-1">
        Fértil: {fmt(cycle.fertileStart)} – {fmt(cycle.fertileEnd)} · Ovulación ≈ {fmt(cycle.ovulation)}
      </p>
    </div>
  )
}

export default function Fertility() {
  const { profile, isLoading } = useCurrentProfile()
  if (isLoading || !profile) return null
  return <FertilityForm profile={profile} />
}

function FertilityForm({ profile }: { profile: BabyProfile }) {
  const navigate = useNavigate()
  const [dateStr, setDateStr] = useState(profile.lastPeriod ? toInputDate(profile.lastPeriod) : '')
  const [cycle, setCycle] = useState(String(profile.cycleLength ?? 28))

  const lastPeriod = dateStr ? fromInputDate(dateStr) : null
  const len = Math.min(45, Math.max(21, parseInt(cycle, 10) || 28))
  const cycles = lastPeriod ? fertileCycles(lastPeriod, len, 3) : []

  async function persist() {
    if (!profile.id || !lastPeriod) return
    await db.profiles.update(profile.id, { lastPeriod, cycleLength: len })
    showToast('Ciclo guardado')
  }

  return (
    <div className="pb-24">
      <BackHeader title="Días fértiles" subtitle="Estimación según la duración del ciclo" />

      <div className="px-5 mb-5">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Primer día de la última regla</label>
            <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} onBlur={persist} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Duración media del ciclo (días)</label>
            <input type="number" inputMode="numeric" value={cycle} onChange={e => setCycle(e.target.value)} onBlur={persist} className={inputCls} />
          </div>
        </div>
      </div>

      {lastPeriod && (
        <>
          <div className="px-5 mb-5">
            <FertilitySummary lastPeriod={lastPeriod} cycleLength={len} />
          </div>
          <div className="px-5 mb-5">
            <SectionLabel>Próximos ciclos</SectionLabel>
            <ul className="space-y-2">
              {cycles.map(c => (
                <li key={+c.periodStart} className="bg-white border border-gray-100 rounded-2xl p-4 text-sm space-y-1">
                  <p className="text-gray-500">Regla: <span className="text-gray-800">{fmt(c.periodStart)}</span></p>
                  <p className="text-gray-500">Ventana fértil: <span className="text-rose-700 font-semibold">{fmt(c.fertileStart)} – {fmt(c.fertileEnd)}</span></p>
                  <p className="text-gray-500">Test de embarazo desde: <span className="text-gray-800">{fmt(c.nextPeriod)}</span></p>
                </li>
              ))}
            </ul>
          </div>
          <div className="px-5 mb-5">
            <button onClick={() => navigate('/herramientas/fecha-parto')} className="w-full bg-white border-2 border-dashed border-blue-200 text-blue-600 rounded-2xl py-3 text-sm font-semibold">
              ¿Positivo? Calcula la fecha de parto →
            </button>
          </div>
        </>
      )}

      <div className="px-5">
        <AlertBox tone="blue">
          Con ciclos irregulares esta estimación es poco fiable: los test de ovulación (LH) ayudan. Si tras 12 meses no hay embarazo (6 si ella tiene 35 años o más), consultad.
        </AlertBox>
      </div>
      <Disclaimer />
    </div>
  )
}
