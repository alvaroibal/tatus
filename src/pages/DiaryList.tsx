import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db } from '../db/db'
import { PageHeader } from '../components/PageHeader'

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-ES', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

export default function DiaryList() {
  const navigate = useNavigate()
  const { profile, isLoading } = useCurrentProfile()
  const [milestonesOnly, setMilestonesOnly] = useState(false)

  const entries = useLiveQuery(
    async () => {
      if (!profile?.id) return []
      const all = await db.diaryEntries.where('profileId').equals(profile.id).toArray()
      return all
        .filter(e => !milestonesOnly || e.milestone)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    },
    [profile?.id, milestonesOnly]
  )

  if (isLoading || !profile) return null

  return (
    <div className="pb-6">
      <PageHeader
        title="Diario"
        right={
          <button
            onClick={() => setMilestonesOnly(v => !v)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
              milestonesOnly
                ? 'bg-yellow-100 text-yellow-700'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            ★ Hitos
          </button>
        }
      />

      {entries === undefined ? null : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-gray-400">
          <p className="text-4xl mb-3">📝</p>
          <p className="text-sm">
            {milestonesOnly
              ? 'Aún no hay hitos marcados.'
              : 'Aún no hay entradas. Escribe la primera.'}
          </p>
        </div>
      ) : (
        <ul className="px-5 space-y-3">
          {entries.map(entry => (
            <li
              key={entry.id}
              className="bg-gray-50 rounded-2xl p-4"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-gray-400 capitalize">
                  {formatDate(entry.date)} · Semana {entry.week}
                </span>
                {entry.milestone && (
                  <span className="text-yellow-400 text-sm">★</span>
                )}
              </div>
              <p className="text-sm text-gray-800 leading-relaxed line-clamp-3">
                {entry.text}
              </p>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => navigate('/diario/nueva')}
        className="fixed bottom-20 right-5 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg text-2xl flex items-center justify-center active:bg-blue-700"
        aria-label="Nueva entrada"
      >
        +
      </button>
    </div>
  )
}
