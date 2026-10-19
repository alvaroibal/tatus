import { useEffect, useState } from 'react'
import { AlertBox, BackHeader, Disclaimer, SectionLabel } from '../../components/ui'
import { formatClock, formatTime } from '../../utils/age'

interface Contraction { start: number; end?: number }

const KEY = 'tatus_contractions'

function load(): Contraction[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
function save(list: Contraction[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list)) } catch { /* sin almacenamiento */ }
}

function fmtSec(ms: number): string {
  const s = Math.round(ms / 1000)
  return s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`
}

export default function Contractions() {
  const [list, setList] = useState<Contraction[]>(load)
  const [now, setNow] = useState(() => Date.now())
  const current = list.length && !list[list.length - 1].end ? list[list.length - 1] : null

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(t)
  }, [])

  function update(next: Contraction[]) {
    setList(next)
    save(next)
  }

  function toggle() {
    if (current) {
      update(list.map((c, i) => (i === list.length - 1 ? { ...c, end: Date.now() } : c)))
    } else {
      update([...list, { start: Date.now() }])
    }
  }

  function clear() {
    if (confirm('¿Borrar todas las contracciones registradas?')) update([])
  }

  const done = list.filter(c => c.end)
  const lastHour = done.filter(c => c.start >= now - 60 * 60_000)
  const intervals = lastHour.slice(1).map((c, i) => c.start - lastHour[i].start)
  const avgInterval = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length : 0
  const avgDuration = lastHour.length ? lastHour.reduce((a, c) => a + (c.end! - c.start), 0) / lastHour.length : 0
  const span = lastHour.length ? lastHour[lastHour.length - 1].start - lastHour[0].start : 0
  const rule511 = lastHour.length >= 8 && avgInterval > 0 && avgInterval <= 5.5 * 60_000 && avgDuration >= 50_000 && span >= 50 * 60_000
  const sinceLast = done.length ? now - done[done.length - 1].start : 0

  return (
    <div className="pb-24">
      <BackHeader
        title="Contracciones"
        subtitle="Pulsa al empezar y al terminar cada contracción"
        right={list.length > 0 ? <button onClick={clear} className="text-xs text-red-400">Borrar</button> : undefined}
      />

      <div className="px-5 flex flex-col items-center mb-6">
        <button
          onClick={toggle}
          className={`w-48 h-48 rounded-full text-white font-bold text-lg shadow-lg active:scale-95 transition-all ${
            current ? 'bg-red-500' : 'bg-blue-600'
          }`}
        >
          {current ? (
            <>
              <span className="block text-4xl tabular-nums">{formatClock(now - current.start)}</span>
              <span className="block text-sm font-medium mt-1">Termina</span>
            </>
          ) : (
            'Empieza'
          )}
        </button>
        {!current && done.length > 0 && (
          <p className="text-sm text-gray-500 mt-4">Desde la última: <span className="font-semibold tabular-nums">{formatClock(sinceLast)}</span></p>
        )}
      </div>

      {rule511 && (
        <div className="px-5 mb-5">
          <AlertBox>
            <strong>Se cumple la regla 5-1-1.</strong> Contracciones cada 5 minutos o menos, de 1 minuto, durante 1 hora. Si es el primer parto, es momento de ir al hospital (o llamad para confirmar).
          </AlertBox>
        </div>
      )}

      {lastHour.length > 1 && (
        <div className="px-5 mb-5 grid grid-cols-3 gap-2 text-center">
          <div className="bg-white border border-gray-100 rounded-2xl py-3">
            <p className="text-sm font-bold text-gray-900">{lastHour.length}</p>
            <p className="text-[10px] text-gray-400">última hora</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl py-3">
            <p className="text-sm font-bold text-gray-900">{avgInterval ? fmtSec(avgInterval) : '—'}</p>
            <p className="text-[10px] text-gray-400">cada (media)</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl py-3">
            <p className="text-sm font-bold text-gray-900">{fmtSec(avgDuration)}</p>
            <p className="text-[10px] text-gray-400">duración media</p>
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div className="px-5">
          <SectionLabel>Registro</SectionLabel>
          <ul className="space-y-1.5">
            {[...done].reverse().slice(0, 30).map((c, idx, arr) => {
              const prev = arr[idx + 1]
              return (
                <li key={c.start} className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex justify-between text-sm">
                  <span className="text-gray-500 tabular-nums">{formatTime(new Date(c.start))}</span>
                  <span className="text-gray-800">dura {fmtSec(c.end! - c.start)}</span>
                  <span className="text-gray-400">{prev ? `cada ${fmtSec(c.start - prev.start)}` : ''}</span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      <div className="px-5 mt-6">
        <AlertBox tone="amber">
          Ve al hospital sin esperar si rompe aguas con líquido verde o con sangre, hay sangrado, fiebre, dolor intenso continuo o notas menos movimientos del bebé.
        </AlertBox>
      </div>
      <Disclaimer>El temporizador se guarda solo en este dispositivo.</Disclaimer>
    </div>
  )
}
