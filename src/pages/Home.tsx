import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { getStage, type Stage } from '../utils/getStage'
import { getPrenatalStage } from '../utils/getPrenatalStage'
import { StageCard } from '../components/StageCard'
import { PrenatalCard } from '../components/PrenatalCard'
import { SkeletonCard } from '../components/SkeletonCard'
import { TryingHome } from '../components/TryingHome'
import { InstallCard } from '../components/InstallCard'
import { Icon, IconBadge, type IconName } from '../components/Icon'
import { Fold, Wordmark } from '../components/ui'
import { ALL_STAGES } from '../utils/stages'
import { ageInMonths, formatAge, formatTime, startOfDay, timeAgo } from '../utils/age'
import { VACCINE_LIST_ID, nextVaccineAlert } from '../utils/vaccines'
import { doseStatus } from '../utils/meds'
import { lifeWeekFor, relevantGuides } from '../data/guides'
import { MILESTONE_LIST_ID, currentMilestoneGroup } from '../data/milestones'
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

function BeforeBirth({ birthDate, childName, currentWeek }: { birthDate: Date; childName: string; currentWeek: number }) {
  const msUntil = new Date(birthDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  const daysUntil = Math.ceil(msUntil / 86_400_000)
  const pregnancyWeek = Math.max(1, 40 + currentWeek)
  return <PrenatalCard pregnancyWeek={pregnancyWeek} stage={getPrenatalStage(pregnancyWeek)} childName={childName} daysUntilBirth={daysUntil} />
}

function Alert({ icon, title, subtitle, onClick, tone = 'amber' }: {
  icon: IconName; title: string; subtitle: string; onClick: () => void; tone?: 'amber' | 'blue'
}) {
  const cls = tone === 'amber'
    ? 'bg-yema-50 border-yema-100 [&_.t]:text-gray-900 [&_.s]:text-yema-700 [&_.c]:text-yema-700'
    : 'bg-tinta-50 border-tinta-100 [&_.t]:text-tinta-800 [&_.s]:text-tinta-600 [&_.c]:text-tinta-500'
  return (
    <button onClick={onClick} className={`w-full border rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left ${cls}`}>
      <Icon name={icon} className="c w-5 h-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="t text-sm font-semibold truncate">{title}</p>
        <p className="s text-sm mt-0.5">{subtitle}</p>
      </div>
      <Icon name="chevron" className="c w-4 h-4 shrink-0" />
    </button>
  )
}

/** Lo esencial del día: una tarea y un dato, que rotan cada día. */
function TodayCard({ stage, dayIndex }: { stage: Stage; dayIndex: number }) {
  const facts = [...stage.physical, ...stage.mental, ...stage.emotional]
  const task = stage.fatherTasks[dayIndex % stage.fatherTasks.length]
  const fact = facts[dayIndex % facts.length]
  return (
    <div className="mx-5 mb-4 bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-tinta-500 mb-1.5">Hoy</p>
        <p className="text-[17px] font-semibold text-gray-900 leading-snug">{task}</p>
      </div>
      {fact && (
        <div className="px-4 py-3 bg-leche border-t border-gray-100 flex gap-2.5">
          <span aria-hidden="true" className="mt-1.5 inline-block w-1 h-3.5 rounded-full bg-yema rotate-[42deg] shrink-0" />
          <p className="text-sm text-gray-700 leading-relaxed">{fact}</p>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const [badgeDismissed, setBadgeDismissed] = useState(false)
  const [dayIndex] = useState(() => Math.floor(Date.now() / 86_400_000))
  const pid = profile?.id

  const extras = useLiveQuery(async () => {
    if (!pid) return null
    const today = startOfDay(new Date())
    const in7 = new Date(+today + 8 * 86_400_000)
    const appts = (await db.appointments.where('profileId').equals(pid).toArray())
      .filter(a => !a.done && new Date(a.date) >= today && new Date(a.date) < in7)
      .sort((a, b) => +new Date(a.date) - +new Date(b.date))
    const checks = (await db.checks.where('profileId').equals(pid).toArray()).filter(c => c.done)
    const vaccineDone = new Set(checks.filter(c => c.key.startsWith(`${pid}|${VACCINE_LIST_ID}|`)).map(c => c.key.split('|')[2]))
    const milestonesDone = new Set(checks.filter(c => c.key.startsWith(`${pid}|${MILESTONE_LIST_ID}|`)).map(c => c.key.split('|')[2]))
    const logs = await db.careLogs.where('profileId').equals(pid).toArray()
    const running = logs.find(l => !l.end && (l.type === 'breast' || l.type === 'sleep'))
    const lastFeed = logs
      .filter(l => l.type === 'breast' || l.type === 'bottle')
      .sort((a, b) => +new Date(b.start) - +new Date(a.start))[0]
    const doses = doseStatus(logs).filter(d => !d.canGiveNow)
    return { nextAppt: appts[0], vaccineDone, milestonesDone, running, lastFeed, doses }
  }, [pid])

  useEffect(() => {
    if (!isLoading && profile === null) navigate('/onboarding', { replace: true })
  }, [isLoading, profile, navigate])

  if (isLoading) return <SkeletonCard />
  if (profile === null) return null

  const trying = profile.phase === 'trying'
  const born = !trying && currentWeek >= 0
  const lw = lifeWeekFor(profile.phase, currentWeek)
  const quickTools = TOOLS.filter(t => lw >= t.from && lw <= t.to_ && !['checklists', 'ficha', 'resumen'].includes(t.id)).slice(0, 4)
  const guides = relevantGuides(lw, 3)
  const vaccineAlert = born && extras ? nextVaccineAlert(profile.birthDate, extras.vaccineDone) : null
  const stage = born ? getStage(currentWeek, ALL_STAGES) : null

  const months = born ? ageInMonths(profile.birthDate) : 0
  const milestoneGroup = born ? currentMilestoneGroup(months) : undefined
  const milestonesPending = milestoneGroup && extras
    ? milestoneGroup.items.filter(i => !extras.milestonesDone.has(i.id)).length
    : 0

  // El aviso de semana nueva se queda hasta que se cierra
  const showBadge = born && !badgeDismissed && currentWeek > getLastSeenWeek(profile.id!)
  function dismissBadge() {
    try { localStorage.setItem(lastSeenKey(profile!.id!), String(currentWeek)) } catch { /* sin almacenamiento */ }
    setBadgeDismissed(true)
  }

  const subtitle = trying
    ? 'Buscando bebé'
    : born
      ? formatAge(profile.birthDate)
      : `Semana ${Math.max(1, 40 + currentWeek)} de embarazo`

  return (
    <div className="pb-4">
      {/* Cabecera */}
      <div className="px-5 pt-10 pb-4 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          {trying
            ? <Wordmark className="text-3xl text-tinta-600" />
            : <p className="font-display text-[26px] font-bold text-gray-900 truncate tracking-tight">{profile.name}</p>}
          <p className="text-[15px] text-gray-600 truncate">{subtitle}</p>
        </div>
        {!trying && (
          <button onClick={() => navigate('/urgencias')} className="w-11 h-11 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm active:bg-red-700" aria-label="Urgencias" title="Urgencias">
            <Icon name="siren" className="w-5 h-5" strokeWidth={2} />
          </button>
        )}
        <button onClick={() => navigate('/ajustes')} className="w-11 h-11 rounded-full bg-white border border-gray-100 flex items-center justify-center text-gray-600 shrink-0" aria-label="Ajustes">
          <Icon name="cog" />
        </button>
      </div>

      {/* Avisos */}
      <div className="px-5 space-y-2 mb-4 empty:hidden">
        {showBadge && (
          <button onClick={dismissBadge} className="w-full">
            <div className="bg-tinta-600 text-white rounded-2xl px-4 py-3.5 flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-sm font-semibold">
                <span aria-hidden="true" className="inline-block w-1 h-4 rounded-full bg-yema rotate-[42deg]" />
                Ha empezado la semana {currentWeek}
              </span>
              <Icon name="close" className="w-4 h-4 text-tinta-300" />
            </div>
          </button>
        )}
        {extras?.running && (
          <Alert tone="blue" icon={extras.running.type === 'sleep' ? 'moon' : 'heart'}
            title={extras.running.type === 'sleep' ? 'Durmiendo' : `Tomando pecho ${extras.running.side === 'L' ? 'izquierdo' : 'derecho'}`}
            subtitle={`Desde las ${formatTime(extras.running.start)}`}
            onClick={() => navigate('/herramientas/registro')} />
        )}
        {born && !extras?.running && extras?.lastFeed && currentWeek < 52 && (
          <Alert tone="blue" icon="bottle" title="Última toma" subtitle={timeAgo(extras.lastFeed.start)}
            onClick={() => navigate('/herramientas/registro')} />
        )}
        {extras?.doses.map(d => (
          <Alert key={d.label} icon="pill" title={`${d.label}: próxima dosis desde las ${formatTime(d.nextAllowed)}`}
            subtitle={`Última a las ${formatTime(d.last)}`} onClick={() => navigate('/herramientas/registro')} />
        ))}
        {vaccineAlert && (
          <Alert icon="syringe" title={vaccineAlert.name}
            subtitle={vaccineAlert.daysUntil === 0 ? 'Vacuna hoy' : vaccineAlert.daysUntil === 1 ? 'Vacuna mañana' : `Vacuna en ${vaccineAlert.daysUntil} días`}
            onClick={() => navigate('/vacunas')} />
        )}
        {extras?.nextAppt && (
          <Alert icon="stethoscope" title={extras.nextAppt.title}
            subtitle={new Date(extras.nextAppt.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' }) + ` · ${formatTime(extras.nextAppt.date)}`}
            onClick={() => navigate('/herramientas/citas')} />
        )}
      </div>

      {/* Contenido de la etapa */}
      {trying ? (
        <TryingHome profile={profile} />
      ) : !born ? (
        <BeforeBirth birthDate={profile.birthDate} childName={profile.name} currentWeek={currentWeek} />
      ) : stage && (
        <>
          <TodayCard stage={stage} dayIndex={dayIndex} />
          {milestoneGroup && milestonesPending > 0 && (
            <div className="px-5 mb-4">
              <Alert tone="blue" icon="sparkles" title={`Hitos de los ${milestoneGroup.label}`}
                subtitle={`${milestonesPending} por marcar · qué suele hacer a su edad`}
                onClick={() => navigate('/herramientas/desarrollo')} />
            </div>
          )}
          <Fold title={currentWeek < 52 ? `Todo sobre la semana ${currentWeek}` : 'Todo sobre esta etapa'}>
            <StageCard week={currentWeek} stage={stage} childName={profile.name} />
          </Fold>
        </>
      )}

      {/* Accesos rápidos */}
      {quickTools.length > 0 && (
        <section className="px-5 mb-5 mt-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Útiles ahora</p>
          <div className="grid grid-cols-4 gap-2">
            {quickTools.map(t => (
              <button key={t.id} onClick={() => navigate(t.to)} className="bg-white border border-gray-100 rounded-2xl py-3 px-1 min-h-[84px] flex flex-col items-center justify-center gap-1.5 active:scale-95 transition-transform">
                <IconBadge name={t.icon} size="sm" />
                <span className="text-xs font-medium text-gray-700 text-center leading-tight">{t.short}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <InstallCard />

      {/* Guías recomendadas */}
      {guides.length > 0 && (
        <section className="px-5 mt-2 mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Para leer ahora</p>
          <div className="space-y-2">
            {guides.map(g => (
              <button key={g.id} onClick={() => navigate(`/guia/${g.id}`)} className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 text-left">
                <span className="text-xl w-8 text-center">{g.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-gray-900">{g.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 truncate">{g.summary}</p>
                </div>
                <Icon name="chevron" className="w-4 h-4 text-gray-400 shrink-0" />
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
