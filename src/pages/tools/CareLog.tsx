import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { useAppConfig } from '../../hooks/useAppConfig'
import { db, type CareLog as CareLogEntry, type CareType } from '../../db/db'
import { Icon, type IconName } from '../../components/Icon'
import { addDays, formatClock, formatDuration, formatTime, startOfDay, timeAgo } from '../../utils/age'
import { doseStatus } from '../../utils/meds'
import { deleteWithUndo, toast } from '../../utils/overlay'

const TYPE_META: Record<CareType, { icon: IconName; label: string }> = {
  breast: { icon: 'heart', label: 'Pecho' },
  bottle: { icon: 'bottle', label: 'Biberón' },
  diaper: { icon: 'diaper', label: 'Pañal' },
  sleep: { icon: 'moon', label: 'Sueño' },
  med: { icon: 'pill', label: 'Medicina' },
  pump: { icon: 'pump', label: 'Extracción' },
}

const DIAPER_LABEL = { wet: 'Pis', dirty: 'Caca', both: 'Pis + caca' } as const

function describe(l: CareLogEntry): string {
  switch (l.type) {
    case 'breast': return `Pecho ${l.side === 'L' ? 'izquierdo' : 'derecho'}${l.end ? ` · ${formatDuration(+new Date(l.end) - +new Date(l.start))}` : ''}`
    case 'bottle': return `Biberón ${l.amountMl ?? '?'} ml${l.milk === 'breast' ? ' (leche materna)' : l.milk === 'formula' ? ' (fórmula)' : ''}`
    case 'diaper': return `Pañal · ${l.diaper ? DIAPER_LABEL[l.diaper] : ''}`
    case 'sleep': return `Sueño${l.end ? ` · ${formatDuration(+new Date(l.end) - +new Date(l.start))}` : ''}`
    case 'med': return `${l.medName || 'Medicina'}${l.amountMl ? ` · ${l.amountMl} ml` : ''}`
    case 'pump': return `Extracción ${l.amountMl ?? '?'} ml`
  }
}

/** "2026-10-24T03:15" para <input type="datetime-local">. */
function toLocalInput(d: Date): string {
  const x = new Date(d)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`
}

/** Paleta de día y de noche (pantalla oscura y cálida para las tomas nocturnas). */
function palette(night: boolean) {
  return night
    ? {
        page: 'bg-tinta-900 text-tinta-100',
        card: 'bg-tinta-800 border-tinta-700',
        sub: 'text-tinta-300',
        strong: 'text-white',
        accent: 'text-yema',
        btn: 'bg-tinta-800 border-tinta-700 text-tinta-100 active:bg-tinta-700',
        btnActive: 'bg-tinta-700 border-yema text-white',
        input: 'w-full bg-tinta-900 border border-tinta-700 rounded-xl px-3 py-3 text-base text-white focus:outline-none focus:ring-2 focus:ring-yema',
        chip: 'bg-tinta-700 text-tinta-100',
        primary: 'bg-yema text-tinta-900',
        running: 'bg-tinta-700 text-white',
        warn: 'bg-tinta-800 border-yema/40',
      }
    : {
        page: 'bg-leche text-gray-900',
        card: 'bg-white border-gray-100',
        sub: 'text-gray-500',
        strong: 'text-gray-900',
        accent: 'text-tinta-600',
        btn: 'bg-white border-gray-100 text-gray-700 active:bg-gray-50',
        btnActive: 'bg-tinta-50 border-tinta-300 text-tinta-800',
        input: 'w-full bg-leche border border-gray-200 rounded-xl px-3 py-3 text-base text-gray-900 focus:outline-none focus:ring-2 focus:ring-tinta-500',
        chip: 'bg-gray-100 text-gray-700',
        primary: 'bg-tinta-600 text-white',
        running: 'bg-tinta-600 text-white',
        warn: 'bg-yema-50 border-yema-100',
      }
}

type Palette = ReturnType<typeof palette>
type FormKind = 'bottle' | 'med' | 'pump'
type AddFn = (entry: Omit<CareLogEntry, 'id' | 'profileId'>, message?: string) => Promise<void>

export default function CareLog() {
  const navigate = useNavigate()
  const { profile, isLoading } = useCurrentProfile()
  const config = useAppConfig()
  const [dayOffset, setDayOffset] = useState(0)
  const [form, setForm] = useState<FormKind | null>(null)
  const [editing, setEditing] = useState<CareLogEntry | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const pid = profile?.id

  const logs = useLiveQuery(async () => {
    if (!pid) return []
    const all = await db.careLogs.where('profileId').equals(pid).toArray()
    return all.sort((a, b) => +new Date(b.start) - +new Date(a.start))
  }, [pid])

  const running = (logs ?? []).filter(l => !l.end && (l.type === 'breast' || l.type === 'sleep'))

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), running.length ? 1000 : 30_000)
    return () => clearInterval(t)
  }, [running.length])

  if (isLoading || !profile) return null

  const hour = new Date(now).getHours()
  const mode = config?.nightMode ?? 'auto'
  const night = mode === 'on' || (mode === 'auto' && (hour >= 21 || hour < 7))
  const c = palette(night)

  const dayStart = addDays(startOfDay(new Date(now)), dayOffset)
  const dayEnd = addDays(dayStart, 1)
  const dayLogs = (logs ?? []).filter(l => {
    const s = new Date(l.start)
    return s >= dayStart && s < dayEnd
  })
  const lastFeed = (logs ?? []).find(l => l.type === 'breast' || l.type === 'bottle')
  const lastBreast = (logs ?? []).find(l => l.type === 'breast')
  const lastBottle = (logs ?? []).find(l => l.type === 'bottle' && l.amountMl)
  const nextSide = lastBreast?.side === 'L' ? 'derecho' : lastBreast?.side === 'R' ? 'izquierdo' : null
  const doses = doseStatus(logs ?? [], new Date(now))

  const add: AddFn = async (entry, message) => {
    try {
      const id = await db.careLogs.add({ ...entry, profileId: pid! })
      if (message) toast(message, { label: 'Deshacer', run: async () => { await db.careLogs.delete(Number(id)) } })
    } catch {
      toast('No se ha podido guardar. Vuelve a intentarlo.')
    }
  }

  async function startTimer(type: 'breast' | 'sleep', side?: 'L' | 'R') {
    for (const r of running.filter(r => r.type === type)) {
      await db.careLogs.update(r.id!, { end: new Date() })
    }
    await add({ type, side, start: new Date() })
  }

  async function stopTimer(l: CareLogEntry) {
    await db.careLogs.update(l.id!, { end: new Date() })
  }

  async function switchSide(l: CareLogEntry) {
    await db.careLogs.update(l.id!, { end: new Date() })
    await add({ type: 'breast', side: l.side === 'L' ? 'R' : 'L', start: new Date() })
  }

  async function toggleNight() {
    // auto → contrario de lo que se ve → auto otra vez
    const next = mode === 'auto' ? (night ? 'off' : 'on') : 'auto'
    await db.appConfig.update(1, { nightMode: next })
  }

  const feeds = dayLogs.filter(l => l.type === 'breast' || l.type === 'bottle')
  const bottleMl = dayLogs.filter(l => l.type === 'bottle').reduce((s, l) => s + (l.amountMl ?? 0), 0)
  const breastMs = dayLogs
    .filter(l => l.type === 'breast')
    .reduce((s, l) => s + ((l.end ? +new Date(l.end) : now) - +new Date(l.start)), 0)
  const wet = dayLogs.filter(l => l.type === 'diaper' && (l.diaper === 'wet' || l.diaper === 'both')).length
  const dirty = dayLogs.filter(l => l.type === 'diaper' && (l.diaper === 'dirty' || l.diaper === 'both')).length
  const sleepMs = dayLogs
    .filter(l => l.type === 'sleep')
    .reduce((s, l) => s + ((l.end ? +new Date(l.end) : now) - +new Date(l.start)), 0)

  const dayLabel = dayOffset === 0 ? 'Hoy' : dayOffset === -1 ? 'Ayer'
    : dayStart.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })

  const quick: { icon: IconName; label: string; onClick: () => void; active?: boolean }[] = [
    { icon: 'heart', label: 'Pecho izq.', onClick: () => startTimer('breast', 'L') },
    { icon: 'heart', label: 'Pecho der.', onClick: () => startTimer('breast', 'R') },
    { icon: 'bottle', label: 'Biberón', onClick: () => setForm(f => f === 'bottle' ? null : 'bottle'), active: form === 'bottle' },
    { icon: 'drop', label: 'Pis', onClick: () => add({ type: 'diaper', diaper: 'wet', start: new Date() }, 'Pañal con pis apuntado') },
    { icon: 'diaper', label: 'Caca', onClick: () => add({ type: 'diaper', diaper: 'dirty', start: new Date() }, 'Pañal con caca apuntado') },
    { icon: 'diaper', label: 'Pis + caca', onClick: () => add({ type: 'diaper', diaper: 'both', start: new Date() }, 'Pañal apuntado') },
    { icon: 'moon', label: 'Dormir', onClick: () => startTimer('sleep') },
    { icon: 'pill', label: 'Medicina', onClick: () => setForm(f => f === 'med' ? null : 'med'), active: form === 'med' },
    { icon: 'pump', label: 'Extracción', onClick: () => setForm(f => f === 'pump' ? null : 'pump'), active: form === 'pump' },
  ]

  return (
    <div className={`min-h-screen pb-28 transition-colors ${c.page}`}>
      <div className="px-5 pt-10 pb-4">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => navigate(-1)} className={`text-sm -ml-2 py-2 pl-1 pr-3 flex items-center gap-0.5 ${c.accent}`}>
            <Icon name="back" className="w-4 h-4" strokeWidth={2.2} /> Atrás
          </button>
          <button onClick={toggleNight} className={`flex items-center gap-1.5 text-sm rounded-full px-3.5 py-2 ${c.chip}`}>
            <Icon name={night ? 'sun' : 'moon'} className="w-4 h-4" />
            {mode === 'auto' ? `${night ? 'Noche' : 'Día'} · auto` : night ? 'Noche' : 'Día'}
          </button>
        </div>
        <h1 className={`text-2xl font-bold ${c.strong}`}>Registro diario</h1>
        <p className={`text-sm mt-1 ${c.sub}`}>{profile.name}</p>
      </div>

      {/* Estado rápido */}
      <div className="px-5 mb-4 grid grid-cols-2 gap-2">
        <div className={`border rounded-2xl p-3.5 ${c.card}`}>
          <p className={`text-[11px] uppercase tracking-widest font-semibold ${c.sub}`}>Última toma</p>
          <p className={`text-lg font-bold mt-1 ${c.strong}`}>{lastFeed ? timeAgo(lastFeed.start, new Date(now)) : '—'}</p>
          {nextSide && <p className={`text-sm mt-0.5 ${c.accent}`}>Toca pecho {nextSide}</p>}
        </div>
        <div className={`border rounded-2xl p-3.5 ${c.card}`}>
          <p className={`text-[11px] uppercase tracking-widest font-semibold ${c.sub}`}>Hoy</p>
          <p className={`text-lg font-bold mt-1 ${c.strong}`}>{feeds.length} {feeds.length === 1 ? 'toma' : 'tomas'}</p>
          <p className={`text-sm mt-0.5 ${c.sub}`}>{wet} pis · {dirty} caca</p>
        </div>
      </div>

      {/* Próxima dosis */}
      {doses.length > 0 && (
        <div className="px-5 mb-4 space-y-2">
          {doses.map(d => (
            <div key={d.label} className={`border rounded-2xl p-3.5 flex items-center gap-3 ${d.canGiveNow ? c.card : c.warn}`}>
              <Icon name="pill" className={`w-6 h-6 shrink-0 ${night ? 'text-yema' : 'text-yema-700'}`} />
              <div className="flex-1">
                <p className={`text-sm font-semibold ${c.strong}`}>
                  {d.canGiveNow
                    ? `${d.label}: ya puede tomar otra dosis si la necesita`
                    : `${d.label}: siguiente dosis desde las ${formatTime(d.nextAllowed)}`}
                </p>
                <p className={`text-xs mt-0.5 ${c.sub}`}>
                  Última a las {formatTime(d.last)} · {d.dosesLast24h} de {d.maxPerDay} dosis en 24 h
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Temporizadores activos */}
      {running.length > 0 && (
        <div className="px-5 mb-4 space-y-2">
          {running.map(r => (
            <div key={r.id} className={`rounded-2xl p-4 flex items-center gap-3 ${c.running}`}>
              <Icon name={TYPE_META[r.type].icon} className="w-7 h-7 shrink-0" />
              <div className="flex-1">
                <p className="text-xs opacity-80">
                  {r.type === 'breast' ? `Pecho ${r.side === 'L' ? 'izquierdo' : 'derecho'}` : 'Durmiendo'} desde las {formatTime(r.start)}
                </p>
                <p className="text-3xl font-bold tabular-nums">{formatClock(now - +new Date(r.start))}</p>
              </div>
              {r.type === 'breast' && (
                <button onClick={() => switchSide(r)} className="text-sm bg-white/15 rounded-xl px-3 py-3">Cambiar</button>
              )}
              <button onClick={() => stopTimer(r)} className={`text-sm font-semibold rounded-xl px-4 py-3 ${night ? 'bg-yema text-tinta-900' : 'bg-white text-tinta-700'}`}>
                Parar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Acciones rápidas */}
      {dayOffset === 0 && (
        <div className="px-5 mb-5">
          <div className="grid grid-cols-3 gap-2">
            {quick.map(q => (
              <button key={q.label} onClick={q.onClick}
                className={`rounded-2xl py-4 min-h-[76px] flex flex-col items-center justify-center gap-1.5 border active:scale-95 transition-transform ${q.active ? c.btnActive : c.btn}`}>
                <Icon name={q.icon} className="w-6 h-6" />
                <span className="text-sm font-medium">{q.label}</span>
              </button>
            ))}
          </div>
          {lastBottle && !form && (
            <button
              onClick={() => add({ type: 'bottle', start: new Date(), amountMl: lastBottle.amountMl, milk: lastBottle.milk }, `Biberón de ${lastBottle.amountMl} ml apuntado`)}
              className={`w-full mt-2 rounded-2xl py-3.5 text-sm font-semibold border flex items-center justify-center gap-2 ${c.btn}`}
            >
              <Icon name="repeat" className="w-4 h-4" /> Repetir biberón de {lastBottle.amountMl} ml
            </button>
          )}
          {form && <QuickForm key={form} kind={form} c={c} lastBottle={lastBottle} onDone={() => setForm(null)} add={add} />}
        </div>
      )}

      {/* Día */}
      <div className="px-5 mb-3 flex items-center justify-between">
        <button onClick={() => setDayOffset(d => d - 1)} className={`p-3 -ml-3 ${c.accent}`} aria-label="Día anterior">
          <Icon name="back" className="w-5 h-5" />
        </button>
        <p className={`text-sm font-semibold capitalize ${c.strong}`}>{dayLabel}</p>
        <button onClick={() => setDayOffset(d => Math.min(0, d + 1))} disabled={dayOffset === 0}
          className={`p-3 -mr-3 disabled:opacity-20 ${c.accent}`} aria-label="Día siguiente">
          <Icon name="chevron" className="w-5 h-5" />
        </button>
      </div>
      <div className="px-5 mb-5 grid grid-cols-4 gap-2 text-center">
        <Stat c={c} value={String(feeds.length)} label="tomas" />
        <Stat c={c} value={bottleMl ? `${bottleMl}` : breastMs ? formatDuration(breastMs) : '0'} label={bottleMl ? 'ml biberón' : 'pecho'} />
        <Stat c={c} value={`${wet}/${dirty}`} label="pis/caca" />
        <Stat c={c} value={sleepMs ? formatDuration(sleepMs) : '0'} label="sueño" />
      </div>

      {/* Lista */}
      <div className="px-5">
        {dayLogs.length === 0 ? (
          <p className={`text-sm text-center py-8 ${c.sub}`}>Sin registros este día.</p>
        ) : (
          <ul className="space-y-2">
            {dayLogs.map(l => (
              <li key={l.id}>
                <button onClick={() => setEditing(l)} className={`w-full border rounded-2xl px-4 py-3.5 flex items-center gap-3 text-left ${c.card}`}>
                  <Icon name={TYPE_META[l.type].icon} className={`w-5 h-5 shrink-0 ${c.sub}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] truncate ${c.strong}`}>{describe(l)}{!l.end && (l.type === 'breast' || l.type === 'sleep') ? ' · en curso' : ''}</p>
                    <p className={`text-xs ${c.sub}`}>{formatTime(l.start)}{l.end ? ` – ${formatTime(l.end)}` : ''}</p>
                  </div>
                  <Icon name="edit" className={`w-4 h-4 shrink-0 ${c.sub}`} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className={`px-5 text-xs text-center leading-relaxed mt-6 ${c.sub}`}>
        Toca un registro para cambiar la hora o borrarlo. A partir del 5.º día lo esperable son 5-6 pañales mojados al día.
      </p>

      {editing && <EditSheet key={editing.id} entry={editing} c={c} onClose={() => setEditing(null)} />}
    </div>
  )
}

function Stat({ value, label, c }: { value: string; label: string; c: Palette }) {
  return (
    <div className={`border rounded-2xl py-2.5 px-1 ${c.card}`}>
      <p className={`text-sm font-bold tabular-nums ${c.strong}`}>{value}</p>
      <p className={`text-[11px] mt-0.5 ${c.sub}`}>{label}</p>
    </div>
  )
}

function QuickForm({ kind, c, lastBottle, onDone, add }: {
  kind: FormKind
  c: Palette
  lastBottle?: CareLogEntry
  onDone: () => void
  add: AddFn
}) {
  const [amount, setAmount] = useState(kind === 'bottle' && lastBottle?.amountMl ? String(lastBottle.amountMl) : '')
  const [milk, setMilk] = useState<'formula' | 'breast'>(lastBottle?.milk ?? 'formula')
  const [medName, setMedName] = useState('')
  const [when, setWhen] = useState(() => toLocalInput(new Date()))

  async function save() {
    const start = new Date(when)
    const ml = amount ? parseFloat(amount.replace(',', '.')) : undefined
    if (kind === 'bottle') {
      if (!ml) return
      await add({ type: 'bottle', start, amountMl: ml, milk }, `Biberón de ${ml} ml apuntado`)
    } else if (kind === 'pump') {
      if (!ml) return
      await add({ type: 'pump', start, amountMl: ml }, `Extracción de ${ml} ml apuntada`)
    } else {
      if (!medName.trim()) return
      await add({ type: 'med', start, medName: medName.trim(), amountMl: ml }, `${medName.trim()} apuntado`)
    }
    onDone()
  }

  return (
    <div className={`mt-3 border rounded-2xl p-4 space-y-3 ${c.card}`}>
      {kind === 'med' && (
        <div>
          <label className={`block text-xs font-medium mb-1 ${c.sub}`}>Medicamento</label>
          <input value={medName} onChange={e => setMedName(e.target.value)} placeholder="ej. Paracetamol 100 mg/ml" className={c.input} />
          <div className="flex gap-2 mt-2 flex-wrap">
            {['Paracetamol', 'Ibuprofeno', 'Vitamina D', 'Hierro', 'Suero oral'].map(n => (
              <button key={n} onClick={() => setMedName(n)} className={`text-sm rounded-full px-3 py-1.5 ${c.chip}`}>{n}</button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className={`block text-xs font-medium mb-1 ${c.sub}`}>{kind === 'med' ? 'Dosis en ml (opcional)' : 'Cantidad (ml)'}</label>
        <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={kind === 'med' ? 'ej. 2.5' : 'ej. 90'} className={c.input} />
      </div>
      {kind === 'bottle' && (
        <>
          <div className="flex gap-2 flex-wrap">
            {[30, 60, 90, 120, 150, 180, 210].map(v => (
              <button key={v} onClick={() => setAmount(String(v))} className={`text-sm rounded-full px-3 py-1.5 ${c.chip}`}>{v}</button>
            ))}
          </div>
          <div className="flex gap-2">
            {(['formula', 'breast'] as const).map(k => (
              <button key={k} onClick={() => setMilk(k)} className={`flex-1 text-sm rounded-xl py-2.5 border ${milk === k ? c.btnActive : c.btn}`}>
                {k === 'formula' ? 'Fórmula' : 'Leche materna'}
              </button>
            ))}
          </div>
        </>
      )}
      <div>
        <label className={`block text-xs font-medium mb-1 ${c.sub}`}>Cuándo</label>
        <input type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} className={c.input} />
      </div>
      <button onClick={save} className={`w-full rounded-xl py-3.5 text-base font-semibold ${c.primary}`}>Guardar</button>
    </div>
  )
}

function EditSheet({ entry, c, onClose }: { entry: CareLogEntry; c: Palette; onClose: () => void }) {
  const [start, setStart] = useState(toLocalInput(entry.start))
  const [end, setEnd] = useState(entry.end ? toLocalInput(entry.end) : '')
  const [amount, setAmount] = useState(entry.amountMl ? String(entry.amountMl) : '')
  const [side, setSide] = useState(entry.side)
  const [diaper, setDiaper] = useState(entry.diaper)
  const [medName, setMedName] = useState(entry.medName ?? '')
  const timed = entry.type === 'breast' || entry.type === 'sleep'

  async function save() {
    const s = new Date(start)
    const e = end ? new Date(end) : undefined
    if (e && e < s) { toast('El final no puede ser antes del inicio.'); return }
    await db.careLogs.update(entry.id!, {
      start: s,
      ...(timed ? { end: e } : {}),
      ...(amount ? { amountMl: parseFloat(amount.replace(',', '.')) } : {}),
      ...(entry.type === 'breast' ? { side } : {}),
      ...(entry.type === 'diaper' ? { diaper } : {}),
      ...(entry.type === 'med' ? { medName: medName.trim() || entry.medName } : {}),
    })
    toast('Registro actualizado')
    onClose()
  }

  async function remove() {
    onClose()
    await deleteWithUndo(`${describe(entry)}: borrado`, () => db.careLogs.delete(entry.id!), () => db.careLogs.put(entry))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Cerrar" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative w-full max-w-lg rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-3 border-t ${c.card}`}>
        <div className="flex items-center justify-between">
          <h2 className={`text-lg font-bold ${c.strong}`}>{TYPE_META[entry.type].label}</h2>
          <button onClick={onClose} className={`p-2 -mr-2 ${c.sub}`} aria-label="Cerrar"><Icon name="close" /></button>
        </div>
        <div>
          <label className={`block text-xs font-medium mb-1 ${c.sub}`}>{timed ? 'Inicio' : 'Cuándo'}</label>
          <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className={c.input} />
        </div>
        {timed && (
          <div>
            <label className={`block text-xs font-medium mb-1 ${c.sub}`}>Final{entry.end ? '' : ' (en curso)'}</label>
            <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} className={c.input} />
          </div>
        )}
        {entry.type === 'breast' && (
          <div className="flex gap-2">
            {(['L', 'R'] as const).map(k => (
              <button key={k} onClick={() => setSide(k)} className={`flex-1 rounded-xl py-3 text-sm border ${side === k ? c.btnActive : c.btn}`}>
                {k === 'L' ? 'Izquierdo' : 'Derecho'}
              </button>
            ))}
          </div>
        )}
        {entry.type === 'diaper' && (
          <div className="flex gap-2">
            {(['wet', 'dirty', 'both'] as const).map(k => (
              <button key={k} onClick={() => setDiaper(k)} className={`flex-1 rounded-xl py-3 text-sm border ${diaper === k ? c.btnActive : c.btn}`}>
                {DIAPER_LABEL[k]}
              </button>
            ))}
          </div>
        )}
        {entry.type === 'med' && (
          <input value={medName} onChange={e => setMedName(e.target.value)} className={c.input} aria-label="Medicamento" />
        )}
        {(entry.type === 'bottle' || entry.type === 'pump' || entry.type === 'med') && (
          <div>
            <label className={`block text-xs font-medium mb-1 ${c.sub}`}>ml</label>
            <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className={c.input} />
          </div>
        )}
        <button onClick={save} className={`w-full rounded-xl py-3.5 text-base font-semibold ${c.primary}`}>Guardar cambios</button>
        <button onClick={remove} className="w-full rounded-xl py-3 text-base text-red-500">Borrar</button>
      </div>
    </div>
  )
}
