import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db, type DiaryEntry, type GrowthRecord } from '../db/db'

declare const __APP_VERSION__: string

interface ReviewData {
  totalEntries: number
  milestonesCount: number
  photosCount: number
  lettersCount: number
  topMilestones: DiaryEntry[]
  growthFirst: GrowthRecord | null
  growthLast: GrowthRecord | null
  weekRange: { min: number; max: number } | null
}

async function computeReview(profileId: number, year: number): Promise<ReviewData> {
  const start = new Date(year, 0, 1)
  const end = new Date(year, 11, 31, 23, 59, 59)

  const inYear = (d: Date | string) => {
    const t = new Date(d).getTime()
    return t >= start.getTime() && t <= end.getTime()
  }

  const [allEntries, allLetters, allGrowth] = await Promise.all([
    db.diaryEntries.where('profileId').equals(profileId).toArray(),
    db.futureLetters.where('profileId').equals(profileId).toArray(),
    db.growthRecords.toArray(),
  ])

  const yearEntries = allEntries.filter(e => inYear(e.date))
  const milestones = yearEntries.filter(e => e.milestone)
  const yearLetters = allLetters.filter(l => inYear(l.date))
  const profileGrowth = allGrowth
    .filter(g => g.profileId === profileId && inYear(g.date))
    .sort((a, b) => a.week - b.week)

  const entryIds = yearEntries.map(e => e.id!).filter(Boolean)
  const photos = entryIds.length
    ? await db.entryPhotos.where('diaryEntryId').anyOf(entryIds).toArray()
    : []

  const weeks = yearEntries.map(e => e.week)

  return {
    totalEntries: yearEntries.length,
    milestonesCount: milestones.length,
    photosCount: photos.length,
    lettersCount: yearLetters.length,
    topMilestones: milestones.slice(0, 5),
    growthFirst: profileGrowth[0] ?? null,
    growthLast: profileGrowth[profileGrowth.length - 1] ?? null,
    weekRange: weeks.length ? { min: Math.min(...weeks), max: Math.max(...weeks) } : null,
  }
}

function StatBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-1">{label}</p>
    </div>
  )
}

export default function YearReview() {
  const navigate = useNavigate()
  const { profile, isLoading } = useCurrentProfile()
  const [year, setYear] = useState(new Date().getFullYear())
  const [data, setData] = useState<ReviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
    setLoading(true)
    computeReview(profile.id, year).then(d => {
      setData(d)
      setLoading(false)
    })
  }, [profile?.id, year])

  if (isLoading || !profile) return null

  const currentYear = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-white pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 border-b border-gray-100">
        <button onClick={() => navigate('/ajustes')} className="text-gray-400">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900 flex-1">Año en review</h1>
      </div>

      {/* Year selector */}
      <div className="flex items-center justify-center gap-6 py-5 border-b border-gray-50">
        <button
          onClick={() => setYear(y => y - 1)}
          className="text-gray-300 text-2xl px-2"
        >
          ‹
        </button>
        <p className="text-xl font-bold text-gray-800 w-16 text-center">{year}</p>
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={year >= currentYear}
          className="text-gray-300 text-2xl px-2 disabled:opacity-20"
        >
          ›
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-300 text-sm">
          Calculando…
        </div>
      ) : data && data.totalEntries === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-gray-400">
          <p className="text-4xl mb-3">📭</p>
          <p className="text-sm">No hay entradas del diario en {year}.</p>
          <p className="text-xs mt-2 text-gray-300">Prueba con otro año.</p>
        </div>
      ) : data ? (
        <div className="px-5 pt-6 space-y-6">
          {/* Baby + week range */}
          {data.weekRange && (
            <div className="bg-blue-50 rounded-2xl px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-1">
                {profile.name} en {year}
              </p>
              <p className="text-sm text-blue-800">
                {data.weekRange.min < 0
                  ? `Embarazo — semana ${Math.max(1, 40 + data.weekRange.min)}`
                  : `Semana ${data.weekRange.min}`}
                {' → '}
                {data.weekRange.max < 0
                  ? `Embarazo — semana ${Math.max(1, 40 + data.weekRange.max)}`
                  : `Semana ${data.weekRange.max}`}
              </p>
            </div>
          )}

          {/* Stats grid */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Este año en números
            </p>
            <div className="grid grid-cols-2 gap-3">
              <StatBox value={data.totalEntries} label="entradas en el diario" />
              <StatBox value={data.milestonesCount} label="hitos especiales" />
              <StatBox value={data.photosCount} label="fotos guardadas" />
              <StatBox value={data.lettersCount} label="cartas escritas" />
            </div>
          </div>

          {/* Growth delta */}
          {data.growthFirst && data.growthLast && data.growthFirst.week !== data.growthLast.week && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Crecimiento
              </p>
              <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
                {data.growthFirst.heightCm != null && data.growthLast.heightCm != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Altura</span>
                    <span className="font-semibold text-gray-900">
                      {data.growthFirst.heightCm} cm → {data.growthLast.heightCm} cm
                      <span className="text-green-500 ml-1 text-xs">
                        +{(data.growthLast.heightCm - data.growthFirst.heightCm).toFixed(1)} cm
                      </span>
                    </span>
                  </div>
                )}
                {data.growthFirst.weightKg != null && data.growthLast.weightKg != null && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Peso</span>
                    <span className="font-semibold text-gray-900">
                      {data.growthFirst.weightKg} kg → {data.growthLast.weightKg} kg
                      <span className="text-green-500 ml-1 text-xs">
                        +{(data.growthLast.weightKg - data.growthFirst.weightKg).toFixed(2)} kg
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top milestones */}
          {data.topMilestones.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
                Momentos del año
              </p>
              <ul className="space-y-3">
                {data.topMilestones.map(entry => (
                  <li key={entry.id} className="flex gap-3">
                    <span className="text-yellow-400 mt-0.5 shrink-0">★</span>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-400 mb-0.5 capitalize">
                        {new Date(entry.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
                        {' · '}
                        {entry.week < 0 ? `S.emb. ${Math.max(1, 40 + entry.week)}` : `Semana ${entry.week}`}
                      </p>
                      <p className="text-sm text-gray-800 leading-relaxed line-clamp-2">{entry.text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-center text-xs text-gray-200 pt-2">
            Tatuś — build {__APP_VERSION__}
          </p>
        </div>
      ) : null}
    </div>
  )
}
