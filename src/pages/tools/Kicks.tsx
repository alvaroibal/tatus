import { useEffect, useState } from 'react'
import { AlertBox, BackHeader, Disclaimer, SectionLabel } from '../../components/ui'
import { formatClock } from '../../utils/age'

interface Session { start: number; end?: number; count: number }

const KEY = 'tatus_kicks'
const GOAL = 10
const LIMIT_MS = 2 * 60 * 60_000

function load(): Session[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
function save(list: Session[]) {
  try { localStorage.setItem(KEY, JSON.stringify(list.slice(-50))) } catch { /* sin almacenamiento */ }
}

export default function Kicks() {
  const [list, setList] = useState<Session[]>(load)
  const [now, setNow] = useState(() => Date.now())
  const active = list.length && !list[list.length - 1].end ? list[list.length - 1] : null

  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])

  function update(next: Session[]) { setList(next); save(next) }

  function start() { update([...list, { start: Date.now(), count: 0 }]) }

  function kick() {
    if (!active) return
    const count = active.count + 1
    update(list.map((s, i) => i === list.length - 1 ? { ...s, count, end: count >= GOAL ? Date.now() : undefined } : s))
  }

  function finish() {
    update(list.map((s, i) => i === list.length - 1 ? { ...s, end: Date.now() } : s))
  }

  const elapsed = active ? now - active.start : 0
  const overLimit = active && elapsed > LIMIT_MS && active.count < GOAL
  const history = list.filter(s => s.end).reverse()

  return (
    <div className="pb-24">
      <BackHeader title="Movimientos del bebé" subtitle="Desde la semana 28: cuenta hasta 10 movimientos" />

      <div className="px-5 flex flex-col items-center mb-6">
        {active ? (
          <>
            <button
              onClick={kick}
              className="w-48 h-48 rounded-full bg-amber-400 text-white shadow-lg active:scale-95 transition-transform"
            >
              <span className="block text-6xl font-bold tabular-nums">{active.count}</span>
              <span className="block text-sm font-medium">de {GOAL} · toca al notarlo</span>
            </button>
            <p className="text-sm text-gray-500 mt-4 tabular-nums">Tiempo: {formatClock(elapsed)}</p>
            <button onClick={finish} className="text-xs text-gray-400 mt-2 underline">Terminar sesión</button>
          </>
        ) : (
          <button onClick={start} className="w-48 h-48 rounded-full bg-blue-600 text-white font-bold text-lg shadow-lg active:scale-95">
            Empezar a contar
          </button>
        )}
      </div>

      {overLimit && (
        <div className="px-5 mb-5">
          <AlertBox>Han pasado más de 2 horas sin llegar a 10 movimientos. Llamad a la matrona o id a urgencias de maternidad.</AlertBox>
        </div>
      )}

      <div className="px-5 mb-6">
        <AlertBox tone="blue">
          Elegid un momento en que el bebé suele estar activo (tras comer, tumbada de lado). Lo importante es conocer su patrón: si notáis que se mueve <strong>menos de lo habitual</strong>, no esperéis al día siguiente.
        </AlertBox>
      </div>

      {history.length > 0 && (
        <div className="px-5">
          <SectionLabel>Sesiones anteriores</SectionLabel>
          <ul className="space-y-1.5">
            {history.slice(0, 20).map(s => (
              <li key={s.start} className="bg-white border border-gray-100 rounded-xl px-4 py-2.5 flex justify-between text-sm">
                <span className="text-gray-500">{new Date(s.start).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-gray-800">{s.count} mov.</span>
                <span className="text-gray-400 tabular-nums">{formatClock(s.end! - s.start)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <Disclaimer />
    </div>
  )
}
