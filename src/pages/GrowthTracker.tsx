import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  ComposedChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db, type BabySex, type GrowthRecord } from '../db/db'
import { showToast } from '../utils/toast'
import { BackHeader } from '../components/ui'
import { fromInputDate, inputCls, toInputDate } from '../components/uiHelpers'
import { classify, referenceSeries, type Metric } from '../data/whoPercentiles'
import { daysBetween } from '../utils/age'

function GrowthChart({ metric, records, sex, maxWeek }: {
  metric: Metric
  records: GrowthRecord[]
  sex?: BabySex
  maxWeek: number
}) {
  const key = metric === 'weight' ? 'weightKg' : 'heightCm'
  const unit = metric === 'weight' ? 'kg' : 'cm'
  const points = records.filter(r => r[key] !== undefined)
  if (points.length === 0) return null

  // Unir referencia OMS y medidas en una sola serie ordenada por semana
  const byWeek = new Map<number, Record<string, number>>()
  if (sex) {
    for (const r of referenceSeries(metric, sex, maxWeek)) {
      byWeek.set(r.semana, { semana: r.semana, P3: r.p3, P50: r.p50, P97: r.p97 })
    }
  }
  for (const r of points) {
    const row = byWeek.get(r.week) ?? { semana: r.week }
    row.Bebé = r[key]!
    byWeek.set(r.week, row)
  }
  const data = [...byWeek.values()].sort((a, b) => a.semana - b.semana)

  return (
    <div className="px-5 mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        {metric === 'weight' ? 'Peso' : 'Talla'}{sex ? ' · percentiles OMS' : ''}
      </p>
      <ResponsiveContainer width="100%" height={210}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="semana" type="number" domain={[0, 'dataMax']} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} unit={` ${unit}`} width={56} domain={['auto', 'auto']} />
          <Tooltip
            formatter={(v, name) => [`${typeof v === 'number' ? Math.round(v * 10) / 10 : v} ${unit}`, name]}
            labelFormatter={l => `Semana ${l}`}
          />
          {sex && <Line dataKey="P97" stroke="#cbd5e1" strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />}
          {sex && <Line dataKey="P50" stroke="#94a3b8" strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />}
          {sex && <Line dataKey="P3" stroke="#cbd5e1" strokeDasharray="4 4" dot={false} connectNulls isAnimationActive={false} />}
          <Line dataKey="Bebé" stroke={metric === 'weight' ? '#1C2650' : '#5E8C69'} strokeWidth={2} dot={{ r: 4 }} connectNulls />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function GrowthTracker() {
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const [weightStr, setWeightStr] = useState('')
  const [heightStr, setHeightStr] = useState('')
  const [headStr, setHeadStr] = useState('')
  const [dateStr, setDateStr] = useState(toInputDate(new Date()))
  const [saving, setSaving] = useState(false)

  const records = useLiveQuery(
    async () => {
      if (!profile?.id) return []
      const all = await db.growthRecords.toArray()
      return all
        .filter(r => r.profileId === profile.id)
        .sort((a, b) => a.week - b.week)
    },
    [profile?.id]
  )

  const measureWeek = profile ? Math.max(0, Math.floor(daysBetween(profile.birthDate, fromInputDate(dateStr)) / 7)) : 0

  useEffect(() => {
    if (!profile?.id || records === undefined) return
    const existing = records.find(r => r.week === measureWeek)
    setWeightStr(existing?.weightKg !== undefined ? String(existing.weightKg) : '')
    setHeightStr(existing?.heightCm !== undefined ? String(existing.heightCm) : '')
    setHeadStr(existing?.headCm !== undefined ? String(existing.headCm) : '')
  }, [records, measureWeek, profile?.id])

  if (isLoading || !profile) return null

  if (currentWeek < 0 || profile.phase === 'trying') {
    return (
      <div className="pb-6">
        <BackHeader title="Crecimiento" />
        <p className="px-5 text-sm text-gray-400 text-center py-12">
          Podrás registrar peso y talla cuando nazca {profile.name}.
        </p>
      </div>
    )
  }

  async function handleSave() {
    if (!profile?.id) return
    const parse = (s: string) => (s ? parseFloat(s.replace(',', '.')) : undefined)
    const weightKg = parse(weightStr)
    const heightCm = parse(heightStr)
    const headCm = parse(headStr)
    if (!weightKg && !heightCm && !headCm) return

    setSaving(true)
    try {
      await db.growthRecords.put({
        profileId: profile.id,
        week: measureWeek,
        date: fromInputDate(dateStr),
        weightKg,
        heightCm,
        headCm,
      })
      showToast('Medida guardada')
    } catch {
      showToast('No se ha guardado la medida. Puede que el móvil no tenga espacio: exporta un backup desde Ajustes.')
    } finally {
      setSaving(false)
    }
  }

  async function setSex(sex: BabySex) {
    if (profile?.id) await db.profiles.update(profile.id, { sex })
  }

  async function remove(r: GrowthRecord) {
    if (confirm(`¿Borrar la medida de la semana ${r.week}?`)) await db.growthRecords.delete([r.profileId, r.week])
  }

  const recs = records ?? []
  const last = recs[recs.length - 1]
  const maxWeek = Math.max(currentWeek, last?.week ?? 0)

  return (
    <div className="pb-24">
      <BackHeader title="Crecimiento" subtitle={profile.name} />

      {!profile.sex && (
        <div className="px-5 mb-5">
          <div className="bg-tinta-50 rounded-2xl p-4">
            <p className="text-sm text-tinta-900 mb-3">Para comparar con las curvas de la OMS (que son distintas para niños y niñas):</p>
            <div className="flex gap-2">
              <button onClick={() => setSex('boy')} className="flex-1 bg-white rounded-xl py-2 text-sm font-semibold text-tinta-700">Niño</button>
              <button onClick={() => setSex('girl')} className="flex-1 bg-white rounded-xl py-2 text-sm font-semibold text-tinta-700">Niña</button>
            </div>
          </div>
        </div>
      )}

      {last && profile.sex && (last.weightKg || last.heightCm) && (
        <div className="px-5 mb-5">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm space-y-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-1">Última medida · semana {last.week}</p>
            {last.weightKg && <p className="text-gray-800"><strong>{last.weightKg} kg</strong> <span className="text-gray-500">— {classify('weight', profile.sex, last.week, last.weightKg)}</span></p>}
            {last.heightCm && <p className="text-gray-800"><strong>{last.heightCm} cm</strong> <span className="text-gray-500">— {classify('height', profile.sex, last.week, last.heightCm)}</span></p>}
          </div>
        </div>
      )}

      <GrowthChart metric="weight" records={recs} sex={profile.sex} maxWeek={maxWeek} />
      <GrowthChart metric="height" records={recs} sex={profile.sex} maxWeek={maxWeek} />

      {/* Form */}
      <div className="px-5 mb-4">
        <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fecha de la medida · semana {measureWeek}</label>
            <input type="date" value={dateStr} max={toInputDate(new Date())} onChange={e => e.target.value && setDateStr(e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Peso (kg)</label>
              <input type="number" inputMode="decimal" step="0.01" min="0" max="40" value={weightStr} onChange={e => setWeightStr(e.target.value)} placeholder="3.5" className={inputCls} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Talla (cm)</label>
              <input type="number" inputMode="decimal" step="0.1" min="0" max="150" value={heightStr} onChange={e => setHeightStr(e.target.value)} placeholder="50" className={inputCls} />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Cabeza (cm)</label>
              <input type="number" inputMode="decimal" step="0.1" min="0" max="60" value={headStr} onChange={e => setHeadStr(e.target.value)} placeholder="35" className={inputCls} />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || (!weightStr && !heightStr && !headStr)}
            className="w-full bg-tinta-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar medida'}
          </button>
        </div>
      </div>

      {recs.length > 0 && (
        <div className="px-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Historial</p>
          <ul className="space-y-1.5">
            {[...recs].reverse().map(r => (
              <li key={r.week} className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex items-center gap-3 text-sm">
                <span className="text-gray-400 w-12 shrink-0">S{r.week}</span>
                <span className="flex-1 text-gray-800">
                  {[r.weightKg && `${r.weightKg} kg`, r.heightCm && `${r.heightCm} cm`, r.headCm && `PC ${r.headCm} cm`].filter(Boolean).join(' · ')}
                </span>
                <button onClick={() => remove(r)} className="text-gray-300">✕</button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="px-5 text-xs text-gray-400 text-center leading-relaxed mt-6">
        Las líneas discontinuas son los percentiles 3, 50 y 97 de la OMS (aproximados). Lo importante es que siga su propia curva; el pediatra valora la evolución.
      </p>
    </div>
  )
}
