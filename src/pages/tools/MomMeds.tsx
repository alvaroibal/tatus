import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { useAppConfig } from '../../hooks/useAppConfig'
import { db, type MedDose, type MedPlan } from '../../db/db'
import { BackHeader, SectionLabel } from '../../components/ui'
import { Icon } from '../../components/Icon'
import { inputCls, primaryBtn } from '../../components/uiHelpers'
import { EVERY_HOURS_OPTIONS, MED_PRESETS, medCalendarEvents, medOwnerLabel, medStatus, type MedStatus } from '../../utils/momMeds'
import { logMedDose } from '../../utils/medActions'
import { downloadIcs } from '../../utils/ics'
import { formatTime, timeAgo } from '../../utils/age'
import { confirmDialog, deleteWithUndo, toast } from '../../utils/overlay'
import { notificationPermission, requestNotifications } from '../../utils/notify'

const TICK_MS = 30_000
const MAX_EVERY_HOURS = 72
const MAX_DAYS = 365

function toLocalInput(d: Date): string {
  const x = new Date(d)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`
}

function relative(d: Date, now: Date): string {
  const min = Math.round((+d - +now) / 60_000)
  if (min <= 0) return timeAgo(d, now)
  if (min < 60) return `en ${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return `en ${h} h${m ? ` ${m} min` : ''}`
}

function dayLabel(d: Date, now: Date): string {
  const same = new Date(d).toDateString() === now.toDateString()
  return same ? formatTime(d) : `${new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })} ${formatTime(d)}`
}

export default function MomMeds() {
  const { profile, isLoading } = useCurrentProfile()
  const config = useAppConfig()
  const [now, setNow] = useState(() => new Date())
  const [editing, setEditing] = useState<MedPlan | 'new' | null>(null)
  const [perm, setPerm] = useState(notificationPermission)
  const pid = profile?.id

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(t)
  }, [])

  const data = useLiveQuery(async () => {
    if (!pid) return null
    const [plans, doses] = await Promise.all([
      db.medPlans.where('profileId').equals(pid).toArray(),
      db.medDoses.where('profileId').equals(pid).toArray(),
    ])
    return { plans, doses }
  }, [pid])

  if (isLoading || !profile || !data) return null
  const { title, who } = medOwnerLabel(config?.role, config?.partnerName)
  const statuses = data.plans.map(p => medStatus(p, data.doses, now))
  const current = statuses.filter(s => s.level !== 'finished' && s.level !== 'paused')
    .sort((a, b) => +(a.nextDue ?? 0) - +(b.nextDue ?? 0))
  const past = statuses.filter(s => s.level === 'finished' || s.level === 'paused')

  async function enableNotifications() {
    setPerm(await requestNotifications())
  }

  return (
    <div className="pb-28">
      <BackHeader title={title} subtitle="Tratamientos del alta y cuándo toca cada toma" />

      <div className="px-5 space-y-3 mb-5">
        {current.length === 0 && (
          <p className="text-sm text-gray-600 leading-relaxed">
            Apunta lo que le han pautado (analgésicos, hierro, heparina…). Tatuś calcula la próxima toma y avisa en Inicio cuando toca.
          </p>
        )}
        {current.map(s => (
          <PlanCard key={s.plan.id} status={s} now={now} doses={data.doses} who={who} onEdit={() => setEditing(s.plan)} />
        ))}
        <button onClick={() => setEditing('new')} className="w-full bg-white border border-dashed border-gray-300 rounded-2xl py-4 text-sm font-semibold text-tinta-700 flex items-center justify-center gap-2">
          <Icon name="plus" className="w-4 h-4" /> Añadir medicamento
        </button>
      </div>

      {perm === 'default' && current.length > 0 && (
        <div className="px-5 mb-5">
          <button onClick={enableNotifications} className="w-full bg-tinta-50 border border-tinta-100 rounded-2xl px-4 py-3.5 text-left text-sm text-tinta-800 flex items-center gap-3">
            <Icon name="bell" className="w-5 h-5 shrink-0" />
            <span><b>Activar avisos en este móvil.</b> Suenan mientras Tatuś esté abierto o en segundo plano.</span>
          </button>
        </div>
      )}

      {past.length > 0 && (
        <section className="px-5 mb-5">
          <SectionLabel>Terminados o en pausa</SectionLabel>
          <ul className="space-y-2">
            {past.map(s => (
              <li key={s.plan.id}>
                <button onClick={() => setEditing(s.plan)} className="w-full bg-white border border-gray-100 rounded-2xl px-4 py-3 text-left">
                  <p className="text-sm font-semibold text-gray-700">{s.plan.name}</p>
                  <p className="text-xs text-gray-500">{s.level === 'paused' ? 'En pausa' : 'Tratamiento terminado'}{s.last ? ` · última ${dayLabel(s.last, now)}` : ''}</p>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="px-5 text-xs text-gray-500 text-center leading-relaxed">
        Para que suene aunque el móvil esté bloqueado, usa «Añadir al calendario» en cada medicamento: crea las alarmas en el calendario del teléfono.
        Sigue siempre la pauta del informe de alta.
      </p>

      {editing && <PlanSheet key={editing === 'new' ? 'new' : editing.id} plan={editing === 'new' ? undefined : editing} profileId={profile.id!} onClose={() => setEditing(null)} />}
    </div>
  )
}

const LEVEL_STYLE: Record<MedStatus['level'], { card: string; text: string }> = {
  ok: { card: 'bg-white border-gray-100', text: 'text-gray-600' },
  soon: { card: 'bg-yema-50 border-yema-100', text: 'text-yema-700' },
  due: { card: 'bg-yema-50 border-yema', text: 'text-yema-700' },
  late: { card: 'bg-red-50 border-red-200', text: 'text-red-700' },
  finished: { card: 'bg-white border-gray-100', text: 'text-gray-500' },
  paused: { card: 'bg-white border-gray-100', text: 'text-gray-500' },
}

interface PlanCardProps {
  status: MedStatus
  now: Date
  doses: MedDose[]
  who: string
  onEdit: () => void
}

function PlanCard({ status, now, doses, who, onEdit }: PlanCardProps) {
  const { plan, nextDue, level, last, endAt } = status
  const [otherTime, setOtherTime] = useState<string | null>(null)
  const style = LEVEL_STYLE[level]
  const history = doses.filter(d => d.planUid === plan.uid).sort((a, b) => +new Date(b.takenAt) - +new Date(a.takenAt)).slice(0, 4)

  const headline = level === 'late' ? `Retrasada · tocaba a las ${formatTime(nextDue!)}`
    : level === 'due' ? `Toca ahora (${formatTime(nextDue!)})`
      : `Próxima: ${dayLabel(nextDue!, now)} · ${relative(nextDue!, now)}`

  async function take(at?: Date) {
    await logMedDose(plan, status, at ?? new Date())
    setOtherTime(null)
  }

  return (
    <div className={`border-2 rounded-2xl p-4 ${style.card}`}>
      <div className="flex items-start gap-3">
        <Icon name="pill" className={`w-6 h-6 shrink-0 mt-0.5 ${style.text}`} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-gray-900">{plan.name}{plan.dose ? <span className="font-normal text-gray-500"> · {plan.dose}</span> : null}</p>
          <p className={`text-sm font-semibold mt-0.5 ${style.text}`}>{headline}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Cada {plan.everyHours} h{last ? ` · última ${dayLabel(last, now)}` : ' · aún sin tomas'}
            {endAt ? ` · hasta el ${endAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}` : ''}
          </p>
          {plan.notes && <p className="text-xs text-gray-600 mt-1">{plan.notes}</p>}
        </div>
        <button onClick={onEdit} className="p-2 -m-2 text-gray-400" aria-label={`Editar ${plan.name}`}><Icon name="edit" className="w-4 h-4" /></button>
      </div>

      <div className="flex gap-2 mt-3">
        <button onClick={() => take()} className="flex-1 bg-tinta-600 text-white rounded-xl py-3 text-sm font-semibold active:bg-tinta-700">
          {who === 'Tú' ? 'Me la he tomado' : 'Tomada ahora'}
        </button>
        <button onClick={() => setOtherTime(o => o === null ? toLocalInput(new Date()) : null)} className="bg-white border border-gray-200 rounded-xl px-3 text-sm text-gray-700">
          Otra hora
        </button>
      </div>
      {otherTime !== null && (
        <div className="flex gap-2 mt-2">
          <input type="datetime-local" value={otherTime} onChange={e => setOtherTime(e.target.value)} className={`${inputCls} text-base`} aria-label="Hora de la toma" />
          <button onClick={() => take(new Date(otherTime))} className="bg-tinta-600 text-white rounded-xl px-4 text-sm font-semibold">Guardar</button>
        </div>
      )}

      <div className="flex items-center justify-between mt-3 gap-2">
        <p className="text-xs text-gray-500 truncate">
          {history.length ? `Tomas: ${history.map(d => dayLabel(d.takenAt, now)).join(', ')}` : ''}
        </p>
        <button onClick={() => downloadIcs(`${plan.name}.ics`, medCalendarEvents(status, who, now))}
          className="text-xs font-semibold text-tinta-600 flex items-center gap-1 shrink-0 py-1">
          <Icon name="calendar" className="w-3.5 h-3.5" /> Añadir al calendario
        </button>
      </div>
    </div>
  )
}

interface PlanSheetProps {
  plan?: MedPlan
  profileId: number
  onClose: () => void
}

function PlanSheet({ plan, profileId, onClose }: PlanSheetProps) {
  const [name, setName] = useState(plan?.name ?? '')
  const [dose, setDose] = useState(plan?.dose ?? '')
  const [every, setEvery] = useState(String(plan?.everyHours ?? 8))
  const [days, setDays] = useState(plan?.days ? String(plan.days) : '')
  const [start, setStart] = useState(() => toLocalInput(plan?.startAt ?? new Date()))
  const [takenFirst, setTakenFirst] = useState(false)
  const [notes, setNotes] = useState(plan?.notes ?? '')

  function applyPreset(p: typeof MED_PRESETS[number]) {
    setName(p.name)
    setEvery(String(p.everyHours))
    setDose(p.dose ?? '')
    setDays(p.days ? String(p.days) : '')
  }

  async function save() {
    const everyHours = parseFloat(every.replace(',', '.'))
    const nDays = days.trim() ? parseInt(days, 10) : undefined
    const startAt = new Date(start)
    if (!name.trim()) { toast('Escribe el nombre del medicamento.'); return }
    if (!(everyHours > 0 && everyHours <= MAX_EVERY_HOURS)) { toast(`Indica cada cuántas horas (1 a ${MAX_EVERY_HOURS}).`); return }
    if (nDays !== undefined && !(nDays > 0 && nDays <= MAX_DAYS)) { toast('Revisa los días de tratamiento.'); return }
    if (Number.isNaN(+startAt)) { toast('Revisa la hora de inicio.'); return }

    const fields = { name: name.trim(), dose: dose.trim() || undefined, everyHours, days: nDays, startAt, notes: notes.trim() || undefined }
    try {
      if (plan) {
        await db.medPlans.update(plan.id!, fields)
        toast('Medicamento actualizado')
      } else {
        const id = await db.medPlans.add({ ...fields, profileId, active: true })
        if (takenFirst) {
          const saved = await db.medPlans.get(id)
          if (saved?.uid) await db.medDoses.add({ profileId, planUid: saved.uid, takenAt: startAt })
        }
        toast(`${fields.name} añadido`)
      }
      onClose()
    } catch {
      toast('No se ha podido guardar. Vuelve a intentarlo.')
    }
  }

  async function togglePause() {
    await db.medPlans.update(plan!.id!, { active: !plan!.active })
    onClose()
  }

  async function remove() {
    const ok = await confirmDialog({ title: `¿Borrar ${plan!.name}?`, message: 'Se borra también el historial de tomas.', confirmLabel: 'Borrar', danger: true })
    if (!ok) return
    const doses = await db.medDoses.where('planUid').equals(plan!.uid!).toArray()
    onClose()
    await deleteWithUndo(`${plan!.name}: borrado`,
      () => db.transaction('rw', db.medPlans, db.medDoses, async () => {
        await db.medDoses.bulkDelete(doses.map(d => d.id!))
        await db.medPlans.delete(plan!.id!)
      }),
      () => db.transaction('rw', db.medPlans, db.medDoses, async () => {
        await db.medPlans.put(plan!)
        await db.medDoses.bulkPut(doses)
      }))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-3 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{plan ? 'Editar medicamento' : 'Nuevo medicamento'}</h2>
          <button onClick={onClose} className="p-2 -mr-2 text-gray-500" aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        {!plan && (
          <div className="flex gap-2 flex-wrap">
            {MED_PRESETS.map(p => (
              <button key={p.name} onClick={() => applyPreset(p)} className={`text-sm rounded-full px-3 py-1.5 ${name === p.name ? 'bg-tinta-600 text-white' : 'bg-gray-100 text-gray-700'}`}>{p.name}</button>
            ))}
          </div>
        )}
        <div>
          <label htmlFor="med-name" className="block text-xs font-medium text-gray-500 mb-1">Medicamento</label>
          <input id="med-name" value={name} onChange={e => setName(e.target.value)} placeholder="ej. Ibuprofeno 600 mg" className={`${inputCls} text-base`} />
        </div>
        <div>
          <label htmlFor="med-dose" className="block text-xs font-medium text-gray-500 mb-1">Dosis (opcional)</label>
          <input id="med-dose" value={dose} onChange={e => setDose(e.target.value)} placeholder="ej. 1 comprimido" className={`${inputCls} text-base`} />
        </div>
        <div>
          <p className="block text-xs font-medium text-gray-500 mb-1">Cada cuántas horas</p>
          <div className="flex gap-2">
            {EVERY_HOURS_OPTIONS.map(h => (
              <button key={h} onClick={() => setEvery(String(h))} className={`flex-1 rounded-xl py-2.5 text-sm border ${every === String(h) ? 'bg-tinta-50 border-tinta-300 text-tinta-800 font-semibold' : 'bg-white border-gray-200 text-gray-700'}`}>{h} h</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="med-start" className="block text-xs font-medium text-gray-500 mb-1">{plan ? 'Inicio' : 'Primera toma'}</label>
            <input id="med-start" type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className={`${inputCls} text-base`} />
          </div>
          <div>
            <label htmlFor="med-days" className="block text-xs font-medium text-gray-500 mb-1">Días (vacío = sin fin)</label>
            <input id="med-days" inputMode="numeric" value={days} onChange={e => setDays(e.target.value)} placeholder="ej. 7" className={`${inputCls} text-base`} />
          </div>
        </div>
        {!plan && (
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={takenFirst} onChange={e => setTakenFirst(e.target.checked)} className="w-5 h-5 accent-tinta-600" />
            Esa primera toma ya está hecha
          </label>
        )}
        <div>
          <label htmlFor="med-notes" className="block text-xs font-medium text-gray-500 mb-1">Notas (opcional)</label>
          <input id="med-notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ej. con comida, alternar con paracetamol" className={`${inputCls} text-base`} />
        </div>
        <button onClick={save} className={primaryBtn}>{plan ? 'Guardar cambios' : 'Añadir'}</button>
        {plan && (
          <div className="flex gap-2">
            <button onClick={togglePause} className="flex-1 rounded-xl py-3 text-sm text-gray-700 border border-gray-200">{plan.active ? 'Pausar / terminar' : 'Reanudar'}</button>
            <button onClick={remove} className="flex-1 rounded-xl py-3 text-sm text-red-500 border border-red-100">Borrar</button>
          </div>
        )}
      </div>
    </div>
  )
}
