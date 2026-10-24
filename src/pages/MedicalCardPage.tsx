import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db, type BabyProfile, type MedicalCard } from '../db/db'
import { BackHeader } from '../components/ui'
import { inputCls, primaryBtn } from '../components/uiHelpers'
import { toast } from '../utils/overlay'

const BLOOD = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', '0+', '0−']

const FIELDS: { key: keyof MedicalCard; label: string; placeholder: string; type?: 'tel' | 'area' }[] = [
  { key: 'allergies', label: 'Alergias', placeholder: 'Ninguna conocida / huevo, amoxicilina…', type: 'area' },
  { key: 'conditions', label: 'Enfermedades o antecedentes', placeholder: 'Prematuro, cardiopatía, convulsiones febriles…', type: 'area' },
  { key: 'medications', label: 'Medicación habitual', placeholder: 'Vitamina D 400 UI…', type: 'area' },
  { key: 'pediatrician', label: 'Pediatra', placeholder: 'Nombre' },
  { key: 'pediatricianPhone', label: 'Teléfono del pediatra', placeholder: '9XX XXX XXX', type: 'tel' },
  { key: 'healthCenter', label: 'Centro de salud', placeholder: 'Nombre' },
  { key: 'healthCenterPhone', label: 'Teléfono del centro de salud', placeholder: '9XX XXX XXX', type: 'tel' },
  { key: 'hospital', label: 'Hospital de referencia', placeholder: 'Hospital donde iríais' },
  { key: 'notes', label: 'Otras notas', placeholder: 'Cualquier cosa útil para urgencias', type: 'area' },
]

export default function MedicalCardPage() {
  const { profile, isLoading } = useCurrentProfile()
  if (isLoading || !profile) return null
  return <MedicalForm key={profile.id} profile={profile} />
}

function MedicalForm({ profile }: { profile: BabyProfile }) {
  const navigate = useNavigate()
  const [card, setCard] = useState<MedicalCard>(profile.medical ?? {})

  function set(key: keyof MedicalCard, value: string) {
    setCard(c => ({ ...c, [key]: value || undefined }))
  }

  async function save() {
    await db.profiles.update(profile.id!, { medical: card })
    toast('Ficha guardada')
    navigate(-1)
  }

  return (
    <div className="pb-28">
      <BackHeader title="Ficha médica" subtitle={`${profile.name} · se ve en la pantalla de Urgencias`} />
      <div className="px-5 space-y-4">
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-1.5">Grupo sanguíneo</p>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD.map(b => (
              <button key={b} onClick={() => set('bloodType', card.bloodType === b ? '' : b)}
                className={`rounded-xl py-2.5 text-sm font-semibold border ${card.bloodType === b ? 'bg-tinta-600 border-tinta-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                {b}
              </button>
            ))}
          </div>
        </div>
        {FIELDS.map(f => (
          <div key={f.key}>
            <label htmlFor={f.key} className="block text-sm font-medium text-gray-700 mb-1.5">{f.label}</label>
            {f.type === 'area' ? (
              <textarea id={f.key} rows={2} value={card[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className={`${inputCls} text-base`} />
            ) : (
              <input id={f.key} type={f.type ?? 'text'} inputMode={f.type === 'tel' ? 'tel' : undefined} value={card[f.key] ?? ''} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} className={`${inputCls} text-base`} />
            )}
          </div>
        ))}
        <p className="text-xs text-gray-500 leading-relaxed">
          Se guarda solo en tus dispositivos (y en el de tu pareja si sincronizáis). No pongas el número de la tarjeta sanitaria.
        </p>
        <button onClick={save} className={primaryBtn}>Guardar ficha</button>
      </div>
    </div>
  )
}
