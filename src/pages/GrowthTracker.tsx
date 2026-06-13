import { useState, useEffect } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db } from '../db/db'
import { showToast } from '../utils/toast'
import { PageHeader } from '../components/PageHeader'

export default function GrowthTracker() {
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const [weightStr, setWeightStr] = useState('')
  const [heightStr, setHeightStr] = useState('')
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

  // Pre-fill form if a record already exists for this week
  useEffect(() => {
    if (!profile?.id || records === undefined) return
    const existing = records.find(r => r.week === currentWeek)
    if (existing) {
      setWeightStr(existing.weightKg !== undefined ? String(existing.weightKg) : '')
      setHeightStr(existing.heightCm !== undefined ? String(existing.heightCm) : '')
    }
  }, [records, currentWeek, profile?.id])

  if (isLoading || !profile) return null

  async function handleSave() {
    if (!profile?.id) return
    const weightKg = weightStr ? parseFloat(weightStr) : undefined
    const heightCm = heightStr ? parseFloat(heightStr) : undefined
    if (!weightKg && !heightCm) return

    setSaving(true)
    try {
      await db.growthRecords.put({
        profileId: profile.id,
        week: currentWeek,
        date: new Date(),
        weightKg,
        heightCm,
      })
      showToast('Medida guardada')
    } catch {
      showToast('Error al guardar — tu almacenamiento puede estar lleno.')
    } finally {
      setSaving(false)
    }
  }

  const chartData = (records ?? []).map(r => ({
    semana: r.week,
    Peso: r.weightKg,
    Talla: r.heightCm,
  }))

  const hasChart = chartData.filter(d => d.Peso || d.Talla).length >= 2

  return (
    <div className="pb-6">
      <PageHeader title="Crecimiento" />

      <div className="px-5 mb-6">
        <p className="text-xs text-gray-400 mb-4">Semana {currentWeek} · {profile.name}</p>

        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Peso (kg)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="30"
                value={weightStr}
                onChange={e => setWeightStr(e.target.value)}
                placeholder="ej. 3.5"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 mb-1">Talla (cm)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="150"
                value={heightStr}
                onChange={e => setHeightStr(e.target.value)}
                placeholder="ej. 50"
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || (!weightStr && !heightStr)}
            className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar medida'}
          </button>
        </div>
      </div>

      {hasChart ? (
        <div className="px-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Curva de crecimiento
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="semana" tick={{ fontSize: 11 }} label={{ value: 'semana', position: 'insideBottomRight', offset: -4, fontSize: 10 }} />
              <YAxis yAxisId="peso" orientation="left" tick={{ fontSize: 11 }} unit=" kg" width={45} />
              <YAxis yAxisId="talla" orientation="right" tick={{ fontSize: 11 }} unit=" cm" width={45} />
              <Tooltip
                formatter={(v, name) => [`${v} ${name === 'Peso' ? 'kg' : 'cm'}`, name]}
                labelFormatter={l => `Semana ${l}`}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line yAxisId="peso" type="monotone" dataKey="Peso" stroke="#2563eb" strokeWidth={2} dot={{ r: 4 }} connectNulls />
              <Line yAxisId="talla" type="monotone" dataKey="Talla" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        records !== undefined && records.length > 0 && (
          <p className="px-5 text-xs text-gray-400 text-center mt-2">
            Añade al menos 2 medidas para ver la gráfica.
          </p>
        )
      )}
    </div>
  )
}
