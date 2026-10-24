import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db } from '../db/db'
import { BackHeader } from '../components/ui'
import { Icon, type IconName } from '../components/Icon'
import { formatAge } from '../utils/age'

const RED_FLAGS = [
  'No respira, está morado o no responde → 112',
  'Convulsión, o se atraganta y no puede toser ni llorar → 112',
  'Fiebre en menores de 3 meses',
  'Le cuesta respirar: se le marcan las costillas o respira muy rápido',
  'Manchas que no desaparecen al estirar la piel',
  'Muy adormilado o irritable sin consuelo',
  'Más de 6-8 h sin mojar el pañal, o vómitos continuos',
  'Se ha tragado una pila de botón, un imán o un producto tóxico',
]

function CallButton({ href, icon, title, subtitle, tone }: { href: string; icon: IconName; title: string; subtitle: string; tone: 'red' | 'tinta' | 'white' }) {
  const cls = {
    red: 'bg-red-600 text-white active:bg-red-700',
    tinta: 'bg-tinta-600 text-white active:bg-tinta-700',
    white: 'bg-white text-gray-900 border border-gray-200 active:bg-gray-50',
  }[tone]
  return (
    <a href={href} className={`flex items-center gap-4 rounded-2xl px-5 py-4 min-h-[72px] ${cls}`}>
      <Icon name={icon} className="w-7 h-7 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-lg font-bold leading-tight">{title}</p>
        <p className={`text-sm mt-0.5 ${tone === 'white' ? 'text-gray-500' : 'opacity-85'}`}>{subtitle}</p>
      </div>
      <Icon name="phone" className="w-5 h-5 shrink-0 opacity-80" />
    </a>
  )
}

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}

export default function Emergency() {
  const navigate = useNavigate()
  const { profile, currentWeek, isLoading } = useCurrentProfile()

  const lastWeight = useLiveQuery(async () => {
    if (!profile?.id) return undefined
    const recs = (await db.growthRecords.toArray()).filter(r => r.profileId === profile.id && r.weightKg)
    return recs.sort((a, b) => b.week - a.week)[0]
  }, [profile?.id])

  if (isLoading || !profile) return null
  const m = profile.medical ?? {}
  const born = profile.phase !== 'trying' && currentWeek >= 0

  const facts: [string, string | undefined][] = [
    ['Edad', born ? formatAge(profile.birthDate) : undefined],
    ['Peso', lastWeight?.weightKg ? `${lastWeight.weightKg} kg (semana ${lastWeight.week})` : undefined],
    ['Alergias', m.allergies],
    ['Grupo sanguíneo', m.bloodType],
    ['Enfermedades', m.conditions],
    ['Medicación habitual', m.medications],
    ['Hospital', m.hospital],
  ]

  return (
    <div className="pb-24">
      <BackHeader title="Urgencias" subtitle={profile.name} />

      <div className="px-5 space-y-2 mb-6">
        <CallButton href="tel:112" icon="siren" title="112" subtitle="Emergencias: no respira, convulsión, inconsciente" tone="red" />
        <CallButton href="tel:+34915620420" icon="pill" title="Toxicología" subtitle="91 562 04 20 · si ha tragado algo tóxico (24 h)" tone="tinta" />
        {m.pediatricianPhone && (
          <CallButton href={telHref(m.pediatricianPhone)} icon="stethoscope" title={m.pediatrician || 'Pediatra'} subtitle={m.pediatricianPhone} tone="white" />
        )}
        {m.healthCenterPhone && (
          <CallButton href={telHref(m.healthCenterPhone)} icon="map" title={m.healthCenter || 'Centro de salud'} subtitle={m.healthCenterPhone} tone="white" />
        )}
      </div>

      <section className="px-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">Para enseñar en urgencias</p>
          <button onClick={() => navigate('/ficha')} className="text-sm text-tinta-600 font-medium py-1">Editar</button>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50">
          {facts.map(([k, v]) => (
            <div key={k} className="px-4 py-3 flex justify-between gap-4">
              <span className="text-sm text-gray-500">{k}</span>
              <span className={`text-sm text-right ${v ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>{v || '—'}</span>
            </div>
          ))}
        </div>
        {!profile.medical && (
          <button onClick={() => navigate('/ficha')} className="w-full mt-2 border-2 border-dashed border-tinta-200 text-tinta-600 rounded-2xl py-3 text-sm font-semibold">
            Rellenar la ficha médica →
          </button>
        )}
      </section>

      <section className="px-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Id a urgencias si…</p>
        <ul className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-2">
          {RED_FLAGS.map(f => (
            <li key={f} className="flex gap-2 text-sm text-red-900 leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />{f}
            </li>
          ))}
        </ul>
      </section>

      <div className="px-5 space-y-2">
        <button onClick={() => navigate('/guia/atragantamiento')} className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-left">
          <span className="text-[15px] font-semibold text-gray-900">Qué hacer si se atraganta</span>
          <Icon name="chevron" className="w-4 h-4 text-gray-400" />
        </button>
        <button onClick={() => navigate('/guia/urgencias')} className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-left">
          <span className="text-[15px] font-semibold text-gray-900">Guía completa: cuándo ir a urgencias</span>
          <Icon name="chevron" className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}
