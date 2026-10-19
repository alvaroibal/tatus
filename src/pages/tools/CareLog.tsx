import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { db, type CareLog as CareLogEntry, type CareType } from '../../db/db'
import { BackHeader, SectionLabel } from '../../components/ui'
import { inputCls } from '../../components/uiHelpers'
import { addDays, formatClock, formatDuration, formatTime, startOfDay, timeAgo } from '../../utils/age'
import { showToast } from '../../utils/toast'

const TYPE_META: Record<CareType, { emoji: string; label: string }> = {
  breast: { emoji: '🤱', label: 'Pecho' },
  bottle: { emoji: '🍼', label: 'Biberón' },
  diaper: { emoji: '🧷', label: 'Pañal' },
  sleep: { emoji: '😴', label: 'Sueño' },
  med: { emoji: '💊', label: 'Medicina' },
  pump: { emoji: '🥛', label: 'Extracción' },
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

/** Fecha de hoy con la hora "HH:MM". */
function todayAt(hhmm: string, base = new Date()): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

function nowHHMM(): string {
  return formatTime(new Date())
}

type FormKind = 'bottle' | 'med' | 'pump' | null

export default function CareLog() {
  const { profile, isLoading } = useCurrentProfile()
  const [dayOffset, setDayOffset] = useState(0)
  const [form, setForm] = useState<FormKind>(null)
  const [amount, setAmount] = useState('')
  const [milk, setMilk] = useState<'formula' | 'breast'>('formula')
  const [medName, setMedName] = useState('')
  const [time, setTime] = useState(nowHHMM())
  const [now, setNow] = useState(() => Date.now())

  const pid = profile?.id
  const dayStart = addDays(startOfDay(new Date()), dayOffset)
  const dayEnd = addDays(dayStart, 1)

  const logs = useLiveQuery(async () => {
    if (!pid) return []
    const all = await db.careLogs.where('profileId').equals(pid).toArray()
    return all.sort((a, b) => +new Date(b.start) - +new Date(a.start))
  }, [pid])

  const running = (logs ?? []).filter(l => !l.end && (l.type === 'breast' || l.type === 'sleep'))
  const dayLogs = (logs ?? []).filter(l => {
    const s = new Date(l.start)
    return s >= dayStart && s < dayEnd
  })

  useEffect(() => {
    if (running.length === 0) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running.length])

  if (isLoading || !profile) return null

  const lastFeed = (logs ?? []).find(l => l.type === 'breast' || l.type === 'bottle')
  const lastBreast = (logs ?? []).find(l => l.type === 'breast')
  const nextSide = lastBreast?.side === 'L' ? 'derecho' : lastBreast?.side === 'R' ? 'izquierdo' : null
  const lastMed = (logs ?? []).find(l => l.type === 'med')

  async function add(entry: Omit<CareLogEntry, 'id' | 'profileId'>) {
    try {
      await db.careLogs.add({ ...entry, profileId: pid! })
    } catch {
      showToast('No se pudo guardar.')
    }
  }

  async function startTimer(type: 'breast' | 'sleep', side?: 'L' | 'R') {
    // Solo un temporizador de cada tipo a la vez
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

  async function saveForm() {
    const start = dayOffset === 0 ? todayAt(time) : todayAt(time, dayStart)
    const ml = amount ? parseFloat(amount.replace(',', '.')) : undefined
    if (form === 'bottle') {
      if (!ml) return
      await add({ type: 'bottle', start, amountMl: ml, milk })
    } else if (form === 'pump') {
      if (!ml) return
      await add({ type: 'pump', start, amountMl: ml })
    } else if (form === 'med') {
      if (!medName.trim()) return
      await add({ type: 'med', start, medName: medName.trim(), amountMl: ml })
    }
    showToast('Guardado')
    setForm(null)
    setAmount('')
    setMedName('')
  }

  function openForm(k: FormKind) {
    setTime(nowHHMM())
    setAmount('')
    setForm(f => (f === k ? null : k))
  }

  async function remove(l: CareLogEntry) {
    if (!confirm(`¿Borrar "${describe(l)}"?`)) return
    await db.careLogs.delete(l.id!)
  }

  // ── Resumen del día ────────────────────────────────────────────────────
  const feeds = dayLogs.filter(l => l.type === 'breast' || l.type === 'bottle')
  const bottleMl = dayLogs.filter(l => l.type === 'bottle').reduce((s, l) => s + (l.amountMl ?? 0), 0)
  const breastMin = dayLogs
    .filter(l => l.type === 'breast')
    .reduce((s, l) => s + ((l.end ? +new Date(l.end) : now) - +new Date(l.start)), 0)
  const wet = dayLogs.filter(l => l.type === 'diaper' && (l.diaper === 'wet' || l.diaper === 'both')).length
  const dirty = dayLogs.filter(l => l.type === 'diaper' && (l.diaper === 'dirty' || l.diaper === 'both')).length
  const sleepMs = dayLogs
    .filter(l => l.type === 'sleep')
    .reduce((s, l) => s + ((l.end ? +new Date(l.end) : now) - +new Date(l.start)), 0)

  const dayLabel = dayOffset === 0 ? 'Hoy' : dayOffset === -1 ? 'Ayer'
    : dayStart.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })

  return (
    <div className="pb-24">
      <BackHeader title="Registro diario" subtitle={`Tomas, pañales, sueño y medicinas de ${profile.name}`} />

      {/* Estado rápido */}
      <div className="px-5 mb-4 grid grid-cols-2 gap-2">
        <div className="bg-white border border-gray-100 rounded-2xl p-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Última toma</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{lastFeed ? timeAgo(lastFeed.start) : '—'}</p>
          {nextSide && <p className="text-xs text-blue-600 mt-0.5">Siguiente: pecho {nextSide}</p>}
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-3">
          <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Última medicina</p>
          <p className="text-sm font-semibold text-gray-900 mt-1">{lastMed ? timeAgo(lastMed.start) : '—'}</p>
          {lastMed && <p className="text-xs text-gray-500 mt-0.5 truncate">{lastMed.medName} · {formatTime(lastMed.start)}</p>}
        </div>
      </div>

      {/* Temporizadores activos */}
      {running.length > 0 && (
        <div className="px-5 mb-4 space-y-2">
          {running.map(r => (
            <div key={r.id} className="bg-blue-600 text-white rounded-2xl p-4 flex items-center gap-3">
              <span className="text-2xl">{TYPE_META[r.type].emoji}</span>
              <div className="flex-1">
                <p className="text-xs text-blue-200">
                  {r.type === 'breast' ? `Pecho ${r.side === 'L' ? 'izquierdo' : 'derecho'}` : 'Durmiendo'} desde las {formatTime(r.start)}
                </p>
                <p className="text-2xl font-bold tabular-nums">{formatClock(now - +new Date(r.start))}</p>
              </div>
              {r.type === 'breast' && (
                <button onClick={() => switchSide(r)} className="text-xs bg-blue-500 rounded-xl px-3 py-2">
                  Cambiar
                </button>
              )}
              <button onClick={() => stopTimer(r)} className="text-xs bg-white text-blue-700 font-semibold rounded-xl px-3 py-2">
                Parar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Acciones rápidas */}
      {dayOffset === 0 && (
        <div className="px-5 mb-5">
          <SectionLabel>Añadir</SectionLabel>
          <div className="grid grid-cols-3 gap-2">
            <QuickBtn emoji="🤱" label="Pecho izq." onClick={() => startTimer('breast', 'L')} />
            <QuickBtn emoji="🤱" label="Pecho der." onClick={() => startTimer('breast', 'R')} />
            <QuickBtn emoji="🍼" label="Biberón" active={form === 'bottle'} onClick={() => openForm('bottle')} />
            <QuickBtn emoji="💧" label="Pis" onClick={() => add({ type: 'diaper', diaper: 'wet', start: new Date() }).then(() => showToast('Pañal: pis'))} />
            <QuickBtn emoji="💩" label="Caca" onClick={() => add({ type: 'diaper', diaper: 'dirty', start: new Date() }).then(() => showToast('Pañal: caca'))} />
            <QuickBtn emoji="🧷" label="Ambos" onClick={() => add({ type: 'diaper', diaper: 'both', start: new Date() }).then(() => showToast('Pañal: pis + caca'))} />
            <QuickBtn emoji="😴" label="Dormir" onClick={() => startTimer('sleep')} />
            <QuickBtn emoji="💊" label="Medicina" active={form === 'med'} onClick={() => openForm('med')} />
            <QuickBtn emoji="🥛" label="Extracción" active={form === 'pump'} onClick={() => openForm('pump')} />
          </div>

          {form && (
            <div className="mt-3 bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              {form === 'med' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Medicamento</label>
                  <input value={medName} onChange={e => setMedName(e.target.value)} placeholder="ej. Paracetamol 100 mg/ml" className={inputCls} autoFocus />
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {['Paracetamol', 'Ibuprofeno', 'Vitamina D', 'Hierro', 'Suero oral'].map(n => (
                      <button key={n} onClick={() => setMedName(n)} className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1">{n}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {form === 'med' ? 'Dosis (ml, opcional)' : 'Cantidad (ml)'}
                  </label>
                  <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder={form === 'med' ? 'ej. 2.5' : 'ej. 90'} className={inputCls} autoFocus={form !== 'med'} />
                </div>
                <div className="w-28">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hora</label>
                  <input type="time" value={time} onChange={e => setTime(e.target.value)} className={inputCls} />
                </div>
              </div>
              {form === 'bottle' && (
                <div className="flex gap-2">
                  {(['formula', 'breast'] as const).map(k => (
                    <button key={k} onClick={() => setMilk(k)}
                      className={`flex-1 text-xs rounded-xl py-2 border ${milk === k ? 'bg-blue-50 border-blue-200 text-blue-700 font-semibold' : 'border-gray-200 text-gray-500'}`}>
                      {k === 'formula' ? 'Fórmula' : 'Leche materna'}
                    </button>
                  ))}
                </div>
              )}
              {form === 'bottle' && (
                <div className="flex gap-2 flex-wrap">
                  {[30, 60, 90, 120, 150, 180].map(v => (
                    <button key={v} onClick={() => setAmount(String(v))} className="text-xs bg-gray-100 text-gray-600 rounded-full px-3 py-1">{v} ml</button>
                  ))}
                </div>
              )}
              <button onClick={saveForm} className="w-full bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold">Guardar</button>
            </div>
          )}
        </div>
      )}

      {/* Navegación de días + resumen */}
      <div className="px-5 mb-3 flex items-center justify-between">
        <button onClick={() => setDayOffset(d => d - 1)} className="text-blue-600 text-sm px-2 py-1">‹</button>
        <p className="text-sm font-semibold text-gray-700 capitalize">{dayLabel}</p>
        <button onClick={() => setDayOffset(d => Math.min(0, d + 1))} disabled={dayOffset === 0} className="text-blue-600 text-sm px-2 py-1 disabled:opacity-20">›</button>
      </div>
      <div className="px-5 mb-5 grid grid-cols-4 gap-2 text-center">
        <Stat value={String(feeds.length)} label="tomas" />
        <Stat value={bottleMl ? `${bottleMl}` : breastMin ? formatDuration(breastMin) : '0'} label={bottleMl ? 'ml biberón' : 'pecho'} />
        <Stat value={`${wet}/${dirty}`} label="pis/caca" />
        <Stat value={sleepMs ? formatDuration(sleepMs) : '0'} label="sueño" />
      </div>

      {/* Lista */}
      <div className="px-5">
        {dayLogs.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">Sin registros este día.</p>
        ) : (
          <ul className="space-y-2">
            {dayLogs.map(l => (
              <li key={l.id} className="bg-white border border-gray-100 rounded-2xl px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{TYPE_META[l.type].emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 truncate">{describe(l)}{!l.end && (l.type === 'breast' || l.type === 'sleep') ? ' · en curso' : ''}</p>
                  <p className="text-xs text-gray-400">{formatTime(l.start)}{l.end ? ` – ${formatTime(l.end)}` : ''}</p>
                </div>
                <button onClick={() => remove(l)} className="text-gray-300 text-sm px-1" aria-label="Borrar">✕</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="px-5 text-xs text-gray-400 text-center leading-relaxed mt-6">
        A partir del 5.º día lo esperable son 5-6 pañales mojados al día. Si moja muchos menos o rechaza tomas, consulta.
      </p>
    </div>
  )
}

function QuickBtn({ emoji, label, onClick, active }: { emoji: string; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl py-3 flex flex-col items-center gap-1 border active:scale-95 transition-transform ${
        active ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-100'
      }`}
    >
      <span className="text-xl">{emoji}</span>
      <span className="text-[11px] font-medium text-gray-600">{label}</span>
    </button>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl py-2.5 px-1">
      <p className="text-sm font-bold text-gray-900 tabular-nums">{value}</p>
      <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
