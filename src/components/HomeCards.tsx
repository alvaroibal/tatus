import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { CareLog, MedDose, MedPlan } from '../db/db'
import { Icon } from './Icon'
import { FEED_DUE_H, feedProgress, feedStatus, type FeedLevel } from '../utils/feeding'
import { medStatus } from '../utils/momMeds'
import { logMedDose } from '../utils/medActions'
import { startCareTimer } from '../utils/careActions'
import { formatDuration, formatTime } from '../utils/age'
import { notificationPermission, requestNotifications } from '../utils/notify'
import { toast } from '../utils/overlay'

const TICK_MS = 30_000

/** Re-render periódico para que los contadores avancen solos. */
function useNow(ms = TICK_MS): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), ms)
    return () => clearInterval(t)
  }, [ms])
  return now
}

const FEED_STYLE: Record<FeedLevel, { card: string; bar: string; title: string; sub: string }> = {
  none: { card: 'bg-white border-gray-100', bar: 'bg-gray-200', title: 'text-gray-900', sub: 'text-gray-500' },
  feeding: { card: 'bg-tinta-600 border-tinta-600', bar: 'bg-yema', title: 'text-white', sub: 'text-tinta-100' },
  ok: { card: 'bg-white border-gray-100', bar: 'bg-tinta-500', title: 'text-gray-900', sub: 'text-gray-500' },
  soon: { card: 'bg-yema-50 border-yema-100', bar: 'bg-yema', title: 'text-gray-900', sub: 'text-yema-700' },
  due: { card: 'bg-yema-50 border-yema', bar: 'bg-yema', title: 'text-gray-900', sub: 'text-yema-700' },
  late: { card: 'bg-red-50 border-red-300', bar: 'bg-red-500', title: 'text-red-900', sub: 'text-red-700' },
}

interface FeedCardProps {
  profileId: number
  name: string
  logs: CareLog[]
}

/** Reloj de la última toma con aviso a las 3 h y alerta a las 4 h. */
export function FeedCard({ profileId, name, logs }: FeedCardProps) {
  const navigate = useNavigate()
  const now = useNow()
  const s = feedStatus(logs, now)
  const st = FEED_STYLE[s.level]
  const [perm, setPerm] = useState(notificationPermission)

  const title = s.level === 'none' ? 'Aún no hay tomas apuntadas'
    : s.level === 'feeding' ? `Comiendo desde las ${formatTime(s.last!.start)}`
      : `Última toma hace ${formatDuration(s.elapsedMs)}`

  const subtitle = {
    none: `Apunta la primera y te aviso si pasan más de ${FEED_DUE_H} h.`,
    feeding: `Pecho ${s.last?.side === 'L' ? 'izquierdo' : 'derecho'} · ${formatDuration(s.elapsedMs)}`,
    ok: `A las ${s.last ? formatTime(s.last.start) : ''} · la próxima hacia las ${s.dueAt ? formatTime(s.dueAt) : ''}`,
    soon: `Toca pronto: antes de las ${s.dueAt ? formatTime(s.dueAt) : ''}`,
    due: `Ya toca darle de comer · no más tarde de las ${s.lateAt ? formatTime(s.lateAt) : ''}`,
    late: `Más de 4 h sin comer: despiértalo y ofrécele. Si no quiere o cuesta despertarlo, llama al pediatra.`,
  }[s.level]

  async function startBreast(side: 'L' | 'R') {
    try {
      await startCareTimer(profileId, 'breast', side)
      toast(`Pecho ${side === 'L' ? 'izquierdo' : 'derecho'} en marcha`)
    } catch {
      toast('No se ha podido guardar. Vuelve a intentarlo.')
    }
  }

  const nextSide = s.last?.type === 'breast' ? (s.last.side === 'L' ? 'R' : 'L') : undefined
  const btn = s.level === 'feeding'
    ? 'bg-white/15 text-white border-white/20'
    : 'bg-white border-gray-200 text-gray-800 active:bg-gray-50'

  return (
    <section aria-label={`Tomas de ${name}`} className={`mx-5 mb-3 border-2 rounded-2xl p-4 ${st.card}`}>
      <button onClick={() => navigate('/herramientas/registro')} className="w-full text-left">
        <div className="flex items-center gap-2">
          <Icon name={s.level === 'late' ? 'siren' : 'bottle'} className={`w-5 h-5 shrink-0 ${st.sub}`} />
          <p className={`text-[17px] font-bold leading-tight ${st.title}`}>{title}</p>
        </div>
        <p className={`text-sm mt-1 ${st.sub}`}>{subtitle}</p>
        {s.last && s.level !== 'feeding' && (
          <div className="mt-3 h-1.5 rounded-full bg-black/5 overflow-hidden" aria-hidden="true">
            <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${Math.round(feedProgress(s) * 100)}%` }} />
          </div>
        )}
      </button>
      {s.level !== 'feeding' && (
        <div className="grid grid-cols-3 gap-2 mt-3">
          {(['L', 'R'] as const).map(side => (
            <button key={side} onClick={() => startBreast(side)}
              className={`rounded-xl py-2.5 text-sm font-medium border ${btn} ${nextSide === side ? 'ring-2 ring-tinta-400' : ''}`}>
              Pecho {side === 'L' ? 'izq.' : 'der.'}
            </button>
          ))}
          <button onClick={() => navigate('/herramientas/registro?form=bottle')} className={`rounded-xl py-2.5 text-sm font-medium border ${btn}`}>
            Biberón
          </button>
        </div>
      )}
      {s.level === 'feeding' && (
        <button onClick={() => navigate('/herramientas/registro')} className="w-full mt-3 rounded-xl py-2.5 text-sm font-semibold bg-yema text-tinta-900">
          Ver temporizador
        </button>
      )}
      {perm === 'default' && s.level !== 'none' && (
        <button onClick={async () => setPerm(await requestNotifications())} className={`mt-3 text-xs font-semibold flex items-center gap-1 ${s.level === 'feeding' ? 'text-tinta-100' : 'text-tinta-600'}`}>
          <Icon name="bell" className="w-3.5 h-3.5" /> Avisarme en este móvil cuando toque
        </button>
      )}
    </section>
  )
}

interface MedAlertsProps {
  plans: MedPlan[]
  doses: MedDose[]
  who: string
}

/** Medicación que toca ya o en la próxima media hora, con botón de «tomada». */
export function MedAlerts({ plans, doses, who }: MedAlertsProps) {
  const navigate = useNavigate()
  const now = useNow()
  const due = plans.map(p => medStatus(p, doses, now)).filter(s => s.level === 'soon' || s.level === 'due' || s.level === 'late')
  if (!due.length) return null
  return (
    <>
      {due.map(s => {
        const late = s.level === 'late'
        return (
          <div key={s.plan.id} className={`border rounded-2xl px-4 py-3 flex items-center gap-3 ${late ? 'bg-red-50 border-red-200' : 'bg-yema-50 border-yema-100'}`}>
            <button onClick={() => navigate('/herramientas/medicacion')} className="flex-1 min-w-0 flex items-center gap-3 text-left">
              <Icon name="pill" className={`w-5 h-5 shrink-0 ${late ? 'text-red-600' : 'text-yema-700'}`} />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900 truncate">{s.plan.name}</span>
                <span className={`block text-sm ${late ? 'text-red-700' : 'text-yema-700'}`}>
                  {who !== 'Tú' ? `${who} · ` : ''}{s.level === 'soon' ? `a las ${formatTime(s.nextDue!)}` : late ? `tocaba a las ${formatTime(s.nextDue!)}` : `toca ahora (${formatTime(s.nextDue!)})`}
                </span>
              </span>
            </button>
            <button onClick={() => logMedDose(s.plan, s, new Date())} className="shrink-0 bg-tinta-600 text-white rounded-xl px-3 py-2.5 text-sm font-semibold">
              Tomada
            </button>
          </div>
        )
      })}
    </>
  )
}

interface BirthCtaProps {
  name: string
  pregnancyWeek: number
}

/** Botón para pasar del embarazo al recién nacido. */
export function BirthCta({ name, pregnancyWeek }: BirthCtaProps) {
  const navigate = useNavigate()
  const prominent = pregnancyWeek >= 34
  return (
    <div className="px-5 mb-4">
      <button onClick={() => navigate('/nacimiento')}
        className={`w-full rounded-2xl px-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform ${prominent ? 'bg-yema text-tinta-900 py-4 shadow-sm' : 'bg-white border border-gray-100 text-gray-800 py-3.5'}`}>
        <Icon name="baby" className="w-6 h-6 shrink-0" />
        <span className="flex-1">
          <span className="block text-[15px] font-bold">¿Ya ha nacido {name}?</span>
          <span className="block text-sm opacity-80">Apunta la hora, el peso, las pruebas y las vacunas</span>
        </span>
        <Icon name="chevron" className="w-4 h-4 shrink-0" />
      </button>
    </div>
  )
}

interface NewbornCardProps {
  name: string
  pendingNow: number
  hasBirthData: boolean
}

/** Acceso a la guía de los primeros días. */
export function NewbornCard({ name, pendingNow, hasBirthData }: NewbornCardProps) {
  const navigate = useNavigate()
  const subtitle = !hasBirthData
    ? 'Apunta la hora exacta y los datos del parto'
    : pendingNow > 0 ? `${pendingNow} ${pendingNow === 1 ? 'cosa toca' : 'cosas tocan'} ahora: pruebas, papeles, cuidados`
      : 'Al día. Mira lo siguiente que toca'
  return (
    <button onClick={() => navigate(hasBirthData ? '/recien-nacido' : '/nacimiento')}
      className={`w-full rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left border ${pendingNow > 0 || !hasBirthData ? 'bg-tinta-600 border-tinta-600 text-white' : 'bg-tinta-50 border-tinta-100 text-tinta-800'}`}>
      <Icon name="checklist" className="w-5 h-5 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold truncate">Primeros días de {name}</span>
        <span className="block text-sm opacity-80">{subtitle}</span>
      </span>
      <Icon name="chevron" className="w-4 h-4 shrink-0" />
    </button>
  )
}
