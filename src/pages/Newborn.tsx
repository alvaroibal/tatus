import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { setCheck, useListChecks } from '../hooks/useChecks'
import { BackHeader, AlertBox, SectionLabel } from '../components/ui'
import { Icon } from '../components/Icon'
import { NEWBORN_CATEGORIES, NEWBORN_LIST_ID, NEWBORN_TASKS, dueLabel, taskDueAt, taskState, type NewbornTask, type TaskState } from '../data/newborn'
import { formatAge } from '../utils/age'

const GROUPS: { state: TaskState; label: string; tone: string }[] = [
  { state: 'overdue', label: 'Ya debería estar hecho', tone: 'text-amber-700' },
  { state: 'now', label: 'Ahora · próximas 48 h', tone: 'text-tinta-600' },
  { state: 'week', label: 'Esta semana', tone: 'text-gray-500' },
  { state: 'later', label: 'Más adelante', tone: 'text-gray-500' },
  { state: 'anytime', label: 'Cuando podáis', tone: 'text-gray-500' },
]

export default function Newborn() {
  const navigate = useNavigate()
  const { profile, isLoading } = useCurrentProfile()
  const checks = useListChecks(profile?.id, NEWBORN_LIST_ID)
  const [now] = useState(() => new Date())
  const [showDone, setShowDone] = useState(false)

  if (isLoading || !profile || !checks) return null
  const pid = profile.id!
  const birth = profile.birth?.at ?? profile.birthDate
  const born = profile.phase !== 'trying' && +new Date(birth) <= +now

  if (!born) {
    return (
      <div className="pb-24">
        <BackHeader title="Primeros días" />
        <div className="px-5 space-y-3">
          <p className="text-sm text-gray-600">Esta guía empieza en cuanto apuntes que {profile.name} ha nacido.</p>
          <button onClick={() => navigate('/nacimiento')} className="w-full bg-yema text-tinta-900 rounded-2xl py-4 font-semibold">¡Ya ha nacido!</button>
        </div>
      </div>
    )
  }

  const rows = NEWBORN_TASKS.map(t => {
    const c = checks.get(t.id)
    return { task: t, check: c, state: taskState(t, birth, !!c, now), due: taskDueAt(t, birth) }
  }).sort((a, b) => (+(a.due ?? Infinity)) - (+(b.due ?? Infinity)))

  const done = rows.filter(r => r.state === 'done')
  const pendingNow = rows.filter(r => r.state === 'overdue' || r.state === 'now').length

  return (
    <div className="pb-24">
      <BackHeader title={`Primeros días de ${profile.name}`}
        subtitle={`${formatAge(birth, now) || 'Recién nacido'} · ${done.length} de ${rows.length} hechas`}
        right={<button onClick={() => navigate('/nacimiento')} className="text-sm text-tinta-600 font-medium py-2">Datos del parto</button>} />

      <div className="px-5 mb-5 space-y-2">
        {!profile.birth && (
          <button onClick={() => navigate('/nacimiento')} className="w-full bg-yema-50 border border-yema-100 rounded-2xl px-4 py-3.5 text-left text-sm">
            <span className="font-semibold text-gray-900">Apunta la hora exacta y los datos del parto</span>
            <span className="block text-yema-700 mt-0.5">Así los plazos se calculan desde el momento real.</span>
          </button>
        )}
        <p className="text-sm text-gray-600 leading-relaxed">
          {pendingNow > 0
            ? `${pendingNow} ${pendingNow === 1 ? 'cosa toca' : 'cosas tocan'} ahora. Marca cada una al hacerla; lo veréis los dos.`
            : 'Nada urgente ahora mismo. Lo siguiente aparece abajo con su plazo.'}
        </p>
      </div>

      {GROUPS.map(g => {
        const list = rows.filter(r => r.state === g.state)
        if (!list.length) return null
        return (
          <section key={g.state} className="mb-6">
            <p className={`px-5 text-xs font-semibold uppercase tracking-widest mb-3 ${g.tone}`}>{g.label}</p>
            <ul className="space-y-2 px-5">
              {list.map(r => <TaskRow key={r.task.id} task={r.task} due={r.due} now={now} done={false} highlight={g.state === 'overdue' || g.state === 'now'}
                onToggle={() => setCheck(pid, NEWBORN_LIST_ID, r.task.id, true)} />)}
            </ul>
          </section>
        )
      })}

      {done.length > 0 && (
        <section className="px-5 mb-6">
          <button onClick={() => setShowDone(v => !v)} className="w-full flex items-center justify-between py-2 text-sm text-gray-600">
            <span>Hechas ({done.length})</span>
            <span className="text-gray-500">{showDone ? 'Ocultar' : 'Ver'}</span>
          </button>
          {showDone && (
            <ul className="space-y-2 mt-2">
              {done.map(r => <TaskRow key={r.task.id} task={r.task} note={r.check?.note} now={now} done
                onToggle={() => setCheck(pid, NEWBORN_LIST_ID, r.task.id, false)} />)}
            </ul>
          )}
        </section>
      )}

      <div className="px-5 space-y-3">
        <SectionLabel>Cuándo ir a urgencias</SectionLabel>
        <AlertBox>
          <b>El bebé:</b> fiebre de 38 °C o más (en menores de 3 meses, siempre), le cuesta respirar o se le hunden las costillas, labios morados, muy amarillo o amarillo las primeras 24 h, no hay manera de despertarlo para comer, menos de 4-5 pañales mojados al día a partir del 5.º día, o vómitos en escopetazo.
        </AlertBox>
        <AlertBox>
          <b>Mamá:</b> empapa una compresa en una hora o expulsa coágulos grandes, fiebre de 38 °C o más, dolor fuerte en la tripa, la pierna o el pecho, dolor de cabeza intenso con visión borrosa, o ideas de hacerse daño (llamad al 024).
        </AlertBox>
        <button onClick={() => navigate('/urgencias')} className="w-full bg-red-600 text-white rounded-2xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2">
          <Icon name="siren" className="w-4 h-4" /> Abrir urgencias
        </button>
        <p className="text-xs text-gray-500 text-center leading-relaxed">
          Plazos orientativos del cribado neonatal del SNS, la AEP y la Seguridad Social. Tu hospital y tu centro de salud pueden variar.
        </p>
      </div>
    </div>
  )
}

interface TaskRowProps {
  task: NewbornTask
  due?: Date
  now: Date
  done: boolean
  note?: string
  highlight?: boolean
  onToggle: () => void
}

function TaskRow({ task, due, now, done, note, highlight, onToggle }: TaskRowProps) {
  const navigate = useNavigate()
  return (
    <li className={`rounded-2xl p-4 flex items-start gap-3 border ${highlight ? 'bg-tinta-50 border-tinta-100' : 'bg-white border-gray-100'} ${done ? 'opacity-70' : ''}`}>
      <button onClick={onToggle} aria-label={done ? `${task.title}: marcar como pendiente` : `${task.title}: marcar como hecho`} aria-pressed={done} className="-m-2 p-2 shrink-0">
        <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm ${done ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'}`}>
          {done ? '✓' : ''}
        </span>
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">{task.title}</p>
        </div>
        <p className="text-[11px] uppercase tracking-wide text-gray-400 mt-0.5">
          {NEWBORN_CATEGORIES[task.category]}{due && !done ? ` · ${dueLabel(due, now)}` : ''}
        </p>
        {!done && <p className="text-xs text-gray-600 mt-1 leading-relaxed">{task.detail}</p>}
        {note && <p className="text-xs text-tinta-700 mt-1">Resultado: {note}</p>}
        {task.link && !done && (
          <button onClick={() => navigate(task.link!.to)} className="text-xs font-semibold text-tinta-600 mt-2 py-1">
            {task.link.label} →
          </button>
        )}
      </div>
    </li>
  )
}
