import { useNavigate, useParams } from 'react-router-dom'
import { AlertBox, BackHeader, Disclaimer } from '../../components/ui'
import { CATEGORY_LABELS, getGuide } from '../../data/guides'

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
      <BackHeader title={`${guide.emoji} ${guide.title}`} subtitle={`${CATEGORY_LABELS[guide.category]} · ${guide.summary}`} />

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
                <span className="mt-2 shrink-0 w-1.5 h-1.5 rounded-full bg-blue-300" />
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
              className="w-full bg-blue-50 text-blue-700 rounded-2xl py-3 px-4 text-sm font-semibold text-left flex justify-between">
              {t.label}<span>→</span>
            </button>
          ))}
        </div>
      )}

      <Disclaimer />
    </div>
  )
}
