import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { PageHeader } from '../../components/PageHeader'
import { LinkRow, SectionLabel } from '../../components/ui'
import { inputCls } from '../../components/uiHelpers'
import { CATEGORY_LABELS, GUIDES, lifeWeekFor, relevantGuides, type GuideCategory } from '../../data/guides'

function normalize(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

export default function GuideList() {
  const navigate = useNavigate()
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<GuideCategory | null>(null)

  if (isLoading || !profile) return null

  const lw = lifeWeekFor(profile.phase, currentWeek)
  const forNow = relevantGuides(lw, 5)
  const query = normalize(q.trim())

  const filtered = GUIDES.filter(g => {
    if (cat && g.category !== cat) return false
    if (!query) return true
    const hay = normalize([g.title, g.summary, ...g.sections.flatMap(s => [s.title, ...s.items])].join(' '))
    return hay.includes(query)
  })

  const showForNow = !query && !cat

  return (
    <div className="pb-6">
      <PageHeader title="Guía" />
      <div className="px-5 mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar: fiebre, biberón, rabietas, permiso…" className={inputCls} type="search" />
      </div>
      <div className="px-5 mb-5 flex gap-2 overflow-x-auto pb-1 -mx-5 pl-5 pr-5 no-scrollbar">
        <Chip active={cat === null} onClick={() => setCat(null)}>Todo</Chip>
        {(Object.keys(CATEGORY_LABELS) as GuideCategory[]).map(c => (
          <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)}>{CATEGORY_LABELS[c]}</Chip>
        ))}
      </div>

      {showForNow && forNow.length > 0 && (
        <section className="px-5 mb-6">
          <SectionLabel>Para vuestro momento</SectionLabel>
          <div className="space-y-2">
            {forNow.map(g => (
              <LinkRow key={g.id} emoji={g.emoji} title={g.title} subtitle={g.summary} onClick={() => navigate(`/guia/${g.id}`)} />
            ))}
          </div>
        </section>
      )}

      <section className="px-5">
        <SectionLabel>{query ? `${filtered.length} resultados` : cat ? CATEGORY_LABELS[cat] : 'Todas las guías'}</SectionLabel>
        <div className="space-y-2">
          {filtered.map(g => (
            <LinkRow key={g.id} emoji={g.emoji} title={g.title} subtitle={g.summary} onClick={() => navigate(`/guia/${g.id}`)} />
          ))}
          {filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nada encontrado. Prueba con otra palabra.</p>}
        </div>
      </section>

      <p className="px-5 text-xs text-gray-400 text-center leading-relaxed mt-6">
        Basado en recomendaciones de AEP, Ministerio de Sanidad, AESAN y OMS. No sustituye a tu matrona ni a tu pediatra.
      </p>
    </div>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`shrink-0 text-xs font-medium rounded-full px-3 py-1.5 transition-colors ${active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
      {children}
    </button>
  )
}
