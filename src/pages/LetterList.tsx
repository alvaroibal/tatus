import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db, type FutureLetter } from '../db/db'
import { exportLettersHTML } from '../utils/exportLetters'
import { showToast } from '../utils/toast'
import { PageHeader } from '../components/PageHeader'

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

function weekLabel(letter: FutureLetter): string {
  if (letter.week < 0 && letter.pregnancyWeek != null) {
    return `Semana ${letter.pregnancyWeek} de embarazo`
  }
  return `Semana ${letter.week} de vida`
}

function preview(letter: FutureLetter): string {
  const text = letter.body.replace(/\n/g, ' ').trim()
  return text.length > 80 ? text.slice(0, 80) + '…' : text
}

export default function LetterList() {
  const navigate = useNavigate()
  const { profile, isLoading } = useCurrentProfile()

  const letters = useLiveQuery(
    async () => {
      if (!profile?.id) return []
      return db.futureLetters
        .where('profileId')
        .equals(profile.id)
        .reverse()
        .sortBy('date')
    },
    [profile?.id]
  )

  if (isLoading || !profile) return null

  async function handleExport() {
    if (!profile) return
    const total = await db.futureLetters.where('profileId').equals(profile.id!).count()
    if (total === 0) {
      showToast('Escribe al menos una carta antes de exportar.')
      return
    }
    try {
      const html = await exportLettersHTML(profile)
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cartas-para-${profile.name.toLowerCase()}-${new Date().getFullYear()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Archivo descargado — guárdalo en un lugar seguro.')
    } catch {
      showToast('Error al exportar.')
    }
  }

  const exportButton = (
    <button onClick={handleExport} className="text-blue-600 text-sm font-medium">
      Exportar
    </button>
  )

  return (
    <div className="pb-6">
      <PageHeader title="Cartas" right={exportButton} />

      {letters === undefined ? null : letters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
          <p className="text-5xl mb-4">✉️</p>
          <p className="text-base font-semibold text-gray-800 mb-2">
            La primera carta está por escribirse
          </p>
          <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
            Escríbele a {profile.name} desde ya. Las leerá cuando sea mayor.
          </p>
        </div>
      ) : (
        <ul className="px-5 space-y-3">
          {letters.map(letter => (
            <li key={letter.id}>
              <button
                onClick={() => navigate(`/cartas/${letter.id}`)}
                className="w-full text-left bg-gray-50 rounded-2xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-blue-600 capitalize">
                        {weekLabel(letter)}
                      </span>
                      {letter.locked && (
                        <span className="text-xs text-gray-300">🔒</span>
                      )}
                    </div>
                    {letter.title && (
                      <p className="text-sm font-semibold text-gray-900 mb-0.5">{letter.title}</p>
                    )}
                    <p className="text-sm text-gray-500 leading-relaxed">{preview(letter)}</p>
                  </div>
                  <span className="text-xs text-gray-300 shrink-0 mt-0.5">{formatDate(letter.date)}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* FAB */}
      <button
        onClick={() => navigate('/cartas/nueva')}
        className="fixed bottom-20 right-5 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center text-2xl active:bg-blue-700"
        aria-label="Escribir carta"
      >
        ✏️
      </button>
    </div>
  )
}
