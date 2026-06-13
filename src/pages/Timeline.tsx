import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db } from '../db/db'
import { PageHeader } from '../components/PageHeader'

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Timeline() {
  const { profile, isLoading } = useCurrentProfile()

  const milestones = useLiveQuery(
    async () => {
      if (!profile?.id) return []
      const all = await db.diaryEntries.where('profileId').equals(profile.id).toArray()
      return all
        .filter(e => e.milestone)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    },
    [profile?.id]
  )

  if (isLoading || !profile) return null

  return (
    <div className="pb-6">
      <PageHeader title="Hitos" />

      {milestones === undefined ? null : milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-gray-400">
          <p className="text-4xl mb-3">⭐</p>
          <p className="text-sm leading-relaxed max-w-xs">
            Aún no hay hitos. Marca una entrada del diario como hito especial y aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="px-5">
          <div className="relative">
            {/* vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-gray-200" />

            <ul className="space-y-6 pl-10">
              {milestones.map(entry => (
                <li key={entry.id} className="relative">
                  {/* dot */}
                  <div className="absolute -left-7 top-1 w-3 h-3 rounded-full bg-yellow-400 border-2 border-white shadow-sm" />
                  <div>
                    <p className="text-xs text-gray-400 capitalize mb-1">
                      {formatDate(entry.date)} · Semana {entry.week}
                    </p>
                    <p className="text-sm text-gray-800 leading-relaxed">{entry.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
