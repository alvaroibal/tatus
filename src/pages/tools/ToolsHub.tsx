import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { PageHeader } from '../../components/PageHeader'
import { LinkRow, SectionLabel } from '../../components/ui'
import { TOOLS } from '../../data/tools'
import { lifeWeekFor } from '../../data/guides'

export default function ToolsHub() {
  const navigate = useNavigate()
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const [showRest, setShowRest] = useState(false)
  if (isLoading || !profile) return null

  const lw = lifeWeekFor(profile.phase, currentWeek)
  const now = TOOLS.filter(t => lw >= t.from && lw <= t.to_)
  const rest = TOOLS.filter(t => !now.includes(t))

  return (
    <div className="pb-6">
      <PageHeader title="Útiles" />
      <section className="px-5 mb-6">
        <SectionLabel>Para esta etapa</SectionLabel>
        <div className="space-y-2">
          {now.map(t => <LinkRow key={t.id} icon={t.icon} title={t.title} subtitle={t.subtitle} onClick={() => navigate(t.to)} />)}
        </div>
      </section>
      {rest.length > 0 && (
        <section className="px-5">
          <button onClick={() => setShowRest(v => !v)} className="w-full flex items-center justify-between py-2 text-sm text-gray-600">
            <span>Otras etapas ({rest.length})</span>
            <span className="text-gray-500">{showRest ? 'Ocultar' : 'Ver'}</span>
          </button>
          {showRest && (
            <div className="space-y-2 mt-2">
              {rest.map(t => <LinkRow key={t.id} icon={t.icon} title={t.title} subtitle={t.subtitle} onClick={() => navigate(t.to)} />)}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
