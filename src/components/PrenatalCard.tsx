import type { PrenatalStage } from '../utils/getPrenatalStage'
import { useAppConfig, partnerLabel, useRole, withPartner } from '../hooks/useAppConfig'
import { Fold } from './ui'

interface Props {
  pregnancyWeek: number
  stage: PrenatalStage
  childName: string
  daysUntilBirth: number
}

function Section({ emoji, title, items, partner }: { emoji: string; title: string; items: string[]; partner: string }) {
  if (items.length === 0) return null
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">
        {emoji} {title}
      </p>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
            <span className="mt-1.5 shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300" />
            {withPartner(item, partner)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PrenatalCard({ pregnancyWeek, stage, childName, daysUntilBirth }: Props) {
  const progress = Math.round((pregnancyWeek / 40) * 100)
  const partner = partnerLabel(useAppConfig())
  const role = useRole()
  const trimester = pregnancyWeek <= 13 ? '1.er trimestre' : pregnancyWeek <= 27 ? '2.º trimestre' : '3.er trimestre'

  return (
    <div className="px-5 pt-6 pb-2">
      {/* Hero counter */}
      <div className="mb-7">
        <p className="text-8xl font-bold text-gray-900 leading-none tabular-nums">
          {daysUntilBirth}
        </p>
        <p className="text-sm text-gray-500 mt-2">días para conocerte, {childName}</p>
      </div>

      {/* Progress bar */}
      <div className="mb-7">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-fase-esperar rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between items-center">
          <span className="text-xs text-gray-500">Semana {pregnancyWeek} de 40</span>
          <span className="text-xs text-gray-300">{trimester}</span>
        </div>
      </div>

      {/* Baby size card */}
      <div className="bg-tinta-50 rounded-2xl px-4 py-3 mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-tinta-400 mb-0.5">
            Tamaño del bebé
          </p>
          <p className="text-base font-semibold text-tinta-900 capitalize">
            {stage.babySize}
          </p>
        </div>
        <div className="text-right">
          {stage.babySizeCm > 0 && (
            <p className="text-sm font-medium text-tinta-700">{stage.babySizeCm} cm</p>
          )}
          {stage.babyWeightG > 0 && (
            <p className="text-xs text-tinta-500">{stage.babyWeightG} g</p>
          )}
        </div>
      </div>

      {/* Lo más importante, a la vista */}
      <Section emoji="🧬" title="Desarrollo esta semana" partner={partner} items={stage.development.slice(0, 2)} />
      <div className="-mx-5">
        <Fold title={`Todo sobre la semana ${pregnancyWeek}`}>
          <div className="px-4 pt-1">
            {stage.development.length > 2 && (
              <Section emoji="🧬" title="Más sobre su desarrollo" partner={partner} items={stage.development.slice(2)} />
            )}
            <Section emoji="🤝" title={role === 'mama' ? `Lo que puede hacer ${partner}` : 'Qué puedes hacer tú'} partner={partner} items={stage.fatherTasks} />
            {stage.shopping.length > 0 && (
              <Section emoji="🛒" title="Considerar comprar" partner={partner} items={stage.shopping} />
            )}
            <Section emoji="💛" title={role === 'mama' ? 'Para ti' : `Cómo ayudar a ${partner}`} partner={partner} items={stage.partnerTips} />
          </div>
        </Fold>
      </div>
    </div>
  )
}
