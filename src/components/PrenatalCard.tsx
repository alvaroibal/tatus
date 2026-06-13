import type { PrenatalStage } from '../utils/getPrenatalStage'

interface Props {
  pregnancyWeek: number
  stage: PrenatalStage
  childName: string
  daysUntilBirth: number
}

function Section({ emoji, title, items }: { emoji: string; title: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        {emoji} {title}
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
            <span className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PrenatalCard({ pregnancyWeek, stage, childName, daysUntilBirth }: Props) {
  return (
    <div className="px-5 pt-4 pb-2">
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Semana {pregnancyWeek} de embarazo
          </h1>
          <span className="text-xs text-gray-400">{daysUntilBirth}d para conocerte</span>
        </div>
        <p className="text-sm text-gray-500">{childName}</p>
      </div>

      {/* Baby size card */}
      <div className="bg-blue-50 rounded-2xl px-4 py-3 mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-400 mb-0.5">
            Tamaño del bebé
          </p>
          <p className="text-base font-semibold text-blue-900 capitalize">
            {stage.babySize}
          </p>
        </div>
        <div className="text-right">
          {stage.babySizeCm > 0 && (
            <p className="text-sm font-medium text-blue-700">{stage.babySizeCm} cm</p>
          )}
          {stage.babyWeightG > 0 && (
            <p className="text-xs text-blue-500">{stage.babyWeightG} g</p>
          )}
        </div>
      </div>

      {/* Content sections */}
      <Section emoji="🧬" title="Desarrollo esta semana" items={stage.development} />
      <Section emoji="👨‍👶" title="Qué hace papá" items={stage.fatherTasks} />
      {stage.shopping.length > 0 && (
        <Section emoji="🛒" title="Considerar comprar" items={stage.shopping} />
      )}
      <Section emoji="💛" title="Cómo ayudar a Natalia" items={stage.partnerTips} />

      {/* Trimester badge */}
      <div className="mt-4 mb-2 flex justify-center">
        <span className="text-xs text-gray-300 px-3 py-1 rounded-full border border-gray-100">
          {pregnancyWeek <= 13
            ? '1.er trimestre'
            : pregnancyWeek <= 27
            ? '2.º trimestre'
            : '3.er trimestre'}
        </span>
      </div>
    </div>
  )
}
