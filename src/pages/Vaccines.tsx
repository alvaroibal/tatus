import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { PageHeader } from '../components/PageHeader'
import vaccinesData from '../data/vaccines.json'

interface Vaccine {
  name: string
  ageInDays: number
  description: string
  important: boolean
}

const vaccines = vaccinesData as Vaccine[]

function vaccineDate(birthDate: Date, ageInDays: number): Date {
  return new Date(new Date(birthDate).setHours(0, 0, 0, 0) + ageInDays * 86_400_000)
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Vaccines() {
  const { profile, isLoading } = useCurrentProfile()
  if (isLoading || !profile) return null

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const withDates = vaccines
    .map(v => ({ ...v, date: vaccineDate(profile.birthDate, v.ageInDays) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  const upcoming = withDates.filter(v => v.date >= today)
  const past = withDates.filter(v => v.date < today)

  return (
    <div className="pb-6">
      <PageHeader title="Vacunas" />
      <p className="px-5 text-xs text-gray-400 mb-4">
        Calendario AEP España 2026 · {profile.name}
      </p>

      {upcoming.length > 0 && (
        <section className="mb-6">
          <p className="px-5 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Próximas
          </p>
          <ul className="space-y-2 px-5">
            {upcoming.map((v, i) => {
              const isNext = i < 3
              return (
                <li
                  key={`${v.name}-${v.ageInDays}`}
                  className={`rounded-2xl p-4 ${
                    isNext ? 'bg-blue-50 border border-blue-100' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isNext ? 'text-blue-900' : 'text-gray-800'}`}>
                        {v.name}
                        {v.important && (
                          <span className="ml-1.5 text-xs text-blue-500">●</span>
                        )}
                      </p>
                      <p className={`text-xs mt-0.5 ${isNext ? 'text-blue-700' : 'text-gray-500'}`}>
                        {v.description}
                      </p>
                    </div>
                    <p className={`text-xs font-medium shrink-0 ${isNext ? 'text-blue-600' : 'text-gray-400'}`}>
                      {formatDate(v.date)}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <p className="px-5 text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Completadas
          </p>
          <ul className="space-y-2 px-5">
            {past.map(v => (
              <li
                key={`${v.name}-${v.ageInDays}`}
                className="rounded-2xl p-4 bg-gray-50 flex items-start gap-3 opacity-60"
              >
                <span className="text-green-500 text-base shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="text-sm font-medium text-gray-700">{v.name}</p>
                  <p className="text-xs text-gray-400">{formatDate(v.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
