import { useNavigate, useParams } from 'react-router-dom'
import { AlertBox, BackHeader, Disclaimer } from '../../components/ui'
import { CATEGORY_LABELS, GUIDE_SOURCES, getGuide } from '../../data/guides'
import { CLINICAL_REVIEWER, CONTENT_REVIEWED, SOURCES } from '../../data/sources'

export default function GuideDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const guide = id ? getGuide(id) : undefined

  if (!guide) {
    return (
      <div>
        <BackHeader title="Guía no encontrada" />
      </div>
    )
  }

  return (
    <div className="pb-24">
      <BackHeader title={guide.title} subtitle={`${CATEGORY_LABELS[guide.category]} · ${guide.summary}`} />

      {guide.alert && (
        <div className="px-5 mb-5">
          <AlertBox>{guide.alert}</AlertBox>
        </div>
      )}

      {guide.sections.map(s => (
        <section key={s.title} className="px-5 mb-6">
          <h2 className="text-base font-bold text-gray-900 mb-2">{s.title}</h2>
          <ul className="space-y-2">
            {s.items.map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-700 leading-relaxed">
                <span className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-tinta-300" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {guide.tools && guide.tools.length > 0 && (
        <div className="px-5 space-y-2">
          {guide.tools.map(t => (
            <button key={t.to} onClick={() => navigate(t.to)}
              className="w-full bg-tinta-50 text-tinta-700 rounded-2xl py-3 px-4 text-sm font-semibold text-left flex justify-between">
              {t.label}<span>→</span>
            </button>
          ))}
        </div>
      )}

      <section className="px-5 mt-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Fuentes</p>
        <ul className="space-y-2">
          {(GUIDE_SOURCES[guide.id] ?? []).map(id => {
            const src = SOURCES[id]
            return (
              <li key={id}>
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="block bg-white border border-gray-100 rounded-2xl px-4 py-3">
                  <p className="text-sm text-tinta-700 font-medium">{src.name} ↗</p>
                  <p className="text-xs text-gray-500 mt-0.5">{src.org}</p>
                </a>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-gray-500 mt-3 leading-relaxed">
          Contenido contrastado con estas fuentes en {CONTENT_REVIEWED}.{' '}
          {CLINICAL_REVIEWER ? `Revisado por ${CLINICAL_REVIEWER}.` : 'Pendiente de revisión por un profesional sanitario.'}
        </p>
      </section>

      <Disclaimer />
    </div>
  )
}
