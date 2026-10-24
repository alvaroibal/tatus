import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db, type BabyProfile } from '../db/db'
import { showToast } from '../utils/toast'
import { addDays } from '../utils/age'
import { dueDateFromLastPeriod } from '../utils/pregnancy'
import { fromInputDate, inputCls } from '../components/uiHelpers'
import { Wordmark } from '../components/ui'

type Stage = 'trying' | 'expecting' | 'born'

const STAGES: { id: Stage; emoji: string; title: string; subtitle: string }[] = [
  { id: 'trying', emoji: '🌱', title: 'Estamos buscando bebé', subtitle: 'Preparación, días fértiles y salud de los dos' },
  { id: 'expecting', emoji: '🤰', title: 'Estamos embarazados', subtitle: 'Semana a semana hasta el parto' },
  { id: 'born', emoji: '👶', title: 'Ya ha nacido', subtitle: 'Desarrollo, registro diario, vacunas y más' },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [stage, setStage] = useState<Stage | null>(null)
  const [name, setName] = useState('')
  const [partner, setPartner] = useState('')
  const [role, setRole] = useState<'papa' | 'mama'>('papa')
  const [dateStr, setDateStr] = useState('')
  const [dateKind, setDateKind] = useState<'due' | 'fur'>('due')
  const [saving, setSaving] = useState(false)

  const needsDate = stage === 'expecting' || stage === 'born'
  const canSubmit = stage && (stage === 'trying' || (dateStr && (stage === 'expecting' || name.trim())))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit || !stage) return
    setSaving(true)
    try {
      let profile: Omit<BabyProfile, 'id'>
      if (stage === 'trying') {
        profile = {
          name: name.trim() || 'Nuestro bebé',
          birthDate: addDays(new Date(), 280),
          createdAt: new Date(),
          phase: 'trying',
        }
      } else {
        const d = fromInputDate(dateStr)
        const isFur = stage === 'expecting' && dateKind === 'fur'
        profile = {
          name: name.trim() || 'Bebé',
          birthDate: isFur ? dueDateFromLastPeriod(d) : d,
          createdAt: new Date(),
          ...(stage === 'expecting' ? { phase: 'expecting' as const } : {}),
          ...(isFur ? { lastPeriod: d, cycleLength: 28 } : {}),
        }
      }

      let profileId: number | undefined
      await db.transaction('rw', db.profiles, db.appConfig, async () => {
        profileId = Number(await db.profiles.add(profile))
        await db.appConfig.put({ id: 1, activeProfileId: profileId, partnerName: partner.trim() || undefined, role })
      })

      if (!profileId) throw new Error('profileId vacío tras la transacción')
      navigate('/')
    } catch (err) {
      console.error('[Onboarding] error al guardar:', err)
      showToast('No se ha guardado. Tus datos siguen aquí; vuelve a intentarlo.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-leche">
      <div className="w-full max-w-sm">
        <Wordmark className="block text-6xl text-tinta-600 mb-8" />
        <h1 className="text-3xl font-bold text-gray-900 mb-2 leading-tight">Una semana cada vez.</h1>
        <p className="text-gray-500 mb-8">Qué le pasa a tu hijo y qué puedes hacer tú, desde que buscáis el embarazo hasta los cinco años. Y todo lo que escribas, guardado para cuando tenga 18.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">¿En qué momento estáis?</p>
            {STAGES.map(s => (
              <button
                type="button"
                key={s.id}
                onClick={() => setStage(s.id)}
                className={`w-full text-left rounded-2xl p-4 border-2 flex items-center gap-3 transition-colors ${
                  stage === s.id ? 'border-tinta-600 bg-tinta-50' : 'border-gray-100'
                }`}
              >
                <span className="text-2xl">{s.emoji}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500">{s.subtitle}</p>
                </div>
              </button>
            ))}
          </div>

          {stage && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del bebé {stage !== 'born' && <span className="text-gray-500 font-normal">(opcional)</span>}
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ej. Marco"
                  required={stage === 'born'} className={`${inputCls} text-base py-3`} />
              </div>

              {needsDate && (
                <div>
                  {stage === 'expecting' && (
                    <div className="flex bg-gray-100 rounded-xl p-1 mb-2">
                      {([['due', 'Sé la fecha probable'], ['fur', 'Sé la última regla']] as const).map(([k, l]) => (
                        <button type="button" key={k} onClick={() => setDateKind(k)}
                          className={`flex-1 text-xs py-2 rounded-lg ${dateKind === k ? 'bg-white shadow-sm font-semibold text-gray-900' : 'text-gray-500'}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  )}
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {stage === 'born' ? 'Fecha de nacimiento' : dateKind === 'due' ? 'Fecha probable de parto' : 'Primer día de la última regla'}
                  </label>
                  <input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} required className={`${inputCls} text-base py-3`} />
                </div>
              )}

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1">Tú eres</p>
                <div className="flex gap-2">
                  {([['papa', 'Papá / pareja'], ['mama', 'Mamá']] as const).map(([k, l]) => (
                    <button type="button" key={k} onClick={() => setRole(k)}
                      className={`flex-1 rounded-xl py-3 text-sm border-2 ${role === k ? 'border-tinta-600 bg-tinta-50 font-semibold text-tinta-800' : 'border-gray-100 text-gray-600'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de tu pareja <span className="text-gray-500 font-normal">(opcional)</span>
                </label>
                <input type="text" value={partner} onChange={e => setPartner(e.target.value)} placeholder="Para personalizar los consejos" className={`${inputCls} text-base py-3`} />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="w-full bg-tinta-600 text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-40 active:bg-tinta-700"
          >
            {saving ? 'Guardando…' : 'Empezar'}
          </button>
        </form>
      </div>
    </div>
  )
}
