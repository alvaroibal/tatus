import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { getStage } from '../utils/getStage'
import { getPrenatalStage } from '../utils/getPrenatalStage'
import { StageCard } from '../components/StageCard'
import { PrenatalCard } from '../components/PrenatalCard'
import { SkeletonCard } from '../components/SkeletonCard'
import { TryingHome } from '../components/TryingHome'
import { ALL_STAGES } from '../utils/stages'
import { formatAge, formatTime, startOfDay, timeAgo } from '../utils/age'
import { VACCINE_LIST_ID, nextVaccineAlert } from '../utils/vaccines'
import { lifeWeekFor, relevantGuides } from '../data/guides'
import { TOOLS } from '../data/tools'
import { db } from '../db/db'

function lastSeenKey(profileId: number) {
  return `tatus_last_week_seen_${profileId}`
}

function getLastSeenWeek(profileId: number): number {
  try {
    return parseInt(localStorage.getItem(lastSeenKey(profileId)) ?? '-1', 10)
  } catch {
    return -1
  }
}

function BeforeBirth({
  birthDate,
  childName,
  currentWeek,
}: {
  birthDate: Date
  childName: string
  currentWeek: number
}) {
  const msUntil = new Date(birthDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  const daysUntil = Math.ceil(msUntil / 86_400_000)
  const pregnancyWeek = Math.max(1, 40 + currentWeek)
  const prenatalStage = getPrenatalStage(pregnancyWeek)
  return <PrenatalCard pregnancyWeek={pregnancyWeek} stage={prenatalStage} childName={childName} daysUntilBirth={daysUntil} />
}

function NextWeekLocked({ unlockDate }: { unlockDate: Date }) {
  const fmt = unlockDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return (
    <div className="mx-5 mb-6 border border-gray-100 rounded-2xl p-4 flex items-center gap-3 opacity-60">
      <div className="text-xl shrink-0">🔒</div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Próxima semana
        </p>
        <p className="text-sm text-gray-500 capitalize">Se desbloquea el {fmt}</p>
      </div>
    </div>
  )
}

function Alert({ emoji, title, subtitle, onClick, tone = 'amber' }: {
  emoji: string; title: string; subtitle: string; onClick: () => void; tone?: 'amber' | 'blue'
}) {
  const cls = tone === 'amber'
    ? 'bg-amber-50 border-amber-100 [&_.t]:text-amber-800 [&_.s]:text-amber-600 [&_.c]:text-amber-400'
    : 'bg-blue-50 border-blue-100 [&_.t]:text-blue-800 [&_.s]:text-blue-600 [&_.c]:text-blue-400'
  return (
    <button onClick={onClick} className={`w-full border rounded-2xl px-4 py-3 flex items-center gap-3 text-left ${cls}`}>
      <span className="text-base shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="t text-xs font-semibold truncate">{title}</p>
        <p className="s text-xs mt-0.5">{subtitle}</p>
      </div>
      <span className="c text-xs font-medium shrink-0">Ver →</span>
    </button>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const [showBadge, setShowBadge] = useState(false)
  const pid = profile?.id

  const extras = useLiveQuery(async () => {
    if (!pid) return null
    const today = startOfDay(new Date())
    const in7 = new Date(+today + 8 * 86_400_000)
    const appts = (await db.appointments.where('profileId').equals(pid).toArray())
      .filter(a => !a.done && new Date(a.date) >= today && new Date(a.date) < in7)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    const vaccineDone = new Set(
      (await db.checks.where('profileId').equals(pid).toArray())
        .filter(c => c.done && c.key.startsWith(`${pid}|${VACCINE_LIST_ID}|`))
        .map(c => c.key.split('|')[2])
    )
    const logs = await db.careLogs.where('profileId').equals(pid).toArray()
    const running = logs.find(l => !l.end && (l.type === 'breast' || l.type === 'sleep'))
    const lastFeed = logs
      .filter(l => l.type === 'breast' || l.type === 'bottle')
      .sort((a, b) => +new Date(b.start) - +new Date(a.start))[0]
    return { nextAppt: appts[0], vaccineDone, running, lastFeed }
  }, [pid])

  useEffect(() => {
    if (!profile?.id || profile.phase === 'trying') return
    const lastSeen = getLastSeenWeek(profile.id)
    if (currentWeek > lastSeen) {
      setShowBadge(lastSeen >= 0 || currentWeek >= 0)
      try { localStorage.setItem(lastSeenKey(profile.id), String(currentWeek)) } catch { /* sin almacenamiento */ }
    }
  }, [profile?.id, profile?.phase, currentWeek])

  useEffect(() => {
    if (!isLoading && profile === null) {
      navigate('/onboarding', { replace: true })
    }
  }, [isLoading, profile, navigate])

  if (isLoading) return <SkeletonCard />
  if (profile === null) return null

  const trying = profile.phase === 'trying'
  const born = !trying && currentWeek >= 0
  const lw = lifeWeekFor(profile.phase, currentWeek)
  const quickTools = TOOLS.filter(t => lw >= t.from && lw <= t.to_ && t.id !== 'checklists').slice(0, 4)
  const guides = relevantGuides(lw, 3)
  const vaccineAlert = born && extras ? nextVaccineAlert(profile.birthDate, extras.vaccineDone) : null

  const subtitle = trying
    ? 'Buscando bebé'
    : born
      ? formatAge(profile.birthDate)
      : `Semana ${Math.max(1, 40 + currentWeek)} de embarazo`

  return (
    <div>
      {/* Cabecera */}
      <div className="px-5 pt-10 pb-3 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-2xl font-bold text-gray-900 truncate">{trying ? 'Tatuś' : profile.name}</p>
          <p className="text-sm text-gray-400">{subtitle}</p>
        </div>
        <button onClick={() => navigate('/ajustes')} className="w-10 h-10 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-400 shrink-0" aria-label="Ajustes">
          <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>

      {/* Accesos rápidos */}
      {quickTools.length > 0 && (
        <div className="px-5 mb-3 grid grid-cols-4 gap-2">
          {quickTools.map(t => (
            <button key={t.id} onClick={() => navigate(t.to)} className="bg-white border border-gray-100 rounded-2xl py-3 px-1 flex flex-col items-center gap-1 active:scale-95 transition-transform">
              <span className="text-xl">{t.emoji}</span>
              <span className="text-[10px] font-medium text-gray-600 text-center leading-tight">{t.short}</span>
            </button>
          ))}
        </div>
      )}

      {/* Avisos */}
      <div className="px-5 space-y-2 mb-1">
        {showBadge && born && (
          <button onClick={() => setShowBadge(false)} className="w-full">
            <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
              <span className="text-sm font-semibold">¡Nueva semana desbloqueada! 🎉</span>
              <span className="text-blue-300 text-sm">✕</span>
            </div>
          </button>
        )}
        {extras?.running && (
          <Alert tone="blue" emoji={extras.running.type === 'sleep' ? '😴' : '🤱'}
            title={extras.running.type === 'sleep' ? 'Durmiendo' : `Tomando pecho ${extras.running.side === 'L' ? 'izquierdo' : 'derecho'}`}
            subtitle={`Desde las ${formatTime(extras.running.start)}`}
            onClick={() => navigate('/herramientas/registro')} />
        )}
        {born && !extras?.running && extras?.lastFeed && currentWeek < 52 && (
          <Alert tone="blue" emoji="🍼" title="Última toma" subtitle={timeAgo(extras.lastFeed.start)}
            onClick={() => navigate('/herramientas/registro')} />
        )}
        {vaccineAlert && (
          <Alert emoji="💉" title={vaccineAlert.name}
            subtitle={vaccineAlert.daysUntil === 0 ? 'Vacuna hoy' : vaccineAlert.daysUntil === 1 ? 'Vacuna mañana' : `Vacuna en ${vaccineAlert.daysUntil} días`}
            onClick={() => navigate('/vacunas')} />
        )}
        {extras?.nextAppt && (
          <Alert emoji="🩺" title={extras.nextAppt.title}
            subtitle={new Date(extras.nextAppt.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }) + ` · ${formatTime(extras.nextAppt.date)}`}
            onClick={() => navigate('/herramientas/citas')} />
        )}
      </div>

      {/* Contenido de la etapa */}
      {trying ? (
        <TryingHome profile={profile} />
      ) : !born ? (
        <BeforeBirth birthDate={profile.birthDate} childName={profile.name} currentWeek={currentWeek} />
      ) : (
        <>
          <StageCard week={currentWeek} stage={getStage(currentWeek, ALL_STAGES)} childName={profile.name} />
          {currentWeek < 52 && (
            <NextWeekLocked unlockDate={new Date(new Date(profile.birthDate).setHours(0, 0, 0, 0) + (currentWeek + 1) * 7 * 86_400_000)} />
          )}
        </>
      )}

      {/* Guías recomendadas */}
      {guides.length > 0 && (
        <section className="px-5 mt-4 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Para leer ahora</p>
          <div className="space-y-2">
            {guides.map(g => (
              <button key={g.id} onClick={() => navigate(`/guia/${g.id}`)} className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 text-left">
                <span className="text-xl">{g.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{g.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{g.summary}</p>
                </div>
                <span className="text-gray-300">›</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
