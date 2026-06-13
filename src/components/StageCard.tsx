import type { Stage } from '../utils/getStage'

interface Props {
  week: number
  stage: Stage
  childName: string
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="text-gray-300 shrink-0 mt-0.5">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function StageCard({ week, stage, childName }: Props) {
  return (
    <div>
      <div className="px-5 pt-5 pb-4">
        <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1">
          Semana {week}
        </p>
        <h2 className="text-xl font-bold text-gray-900 leading-snug">
          ¿Qué pasa esta semana?
        </h2>
        <p className="text-sm text-gray-400 mt-0.5">{childName}</p>
      </div>

      <div className="px-5 space-y-5 pb-4">
        <Section title="Físico" items={stage.physical} />
        <Section title="Mental" items={stage.mental} />
        <Section title="Emocional" items={stage.emotional} />
      </div>

      <div className="px-5 pb-4">
        <div className="bg-blue-50 rounded-2xl p-4">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">
            Tu tarea esta semana
          </h3>
          <ul className="space-y-2.5">
            {stage.fatherTasks.map((task, i) => (
              <li key={i} className="flex gap-2 text-sm text-blue-900">
                <span className="text-blue-400 shrink-0 mt-0.5">→</span>
                <span>{task}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="px-5 pb-6">
        <p className="text-xs text-gray-400 text-center leading-relaxed">
          Contenido basado en AAP Developmental Milestones.
          No reemplaza al pediatra.
        </p>
      </div>
    </div>
  )
}
