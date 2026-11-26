import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { useListChecks } from '../hooks/useChecks'
import type { BabyProfile, BabySex, DeliveryType } from '../db/db'
import { BackHeader, SectionLabel } from '../components/ui'
import { inputCls, primaryBtn } from '../components/uiHelpers'
import { NEWBORN_LIST_ID, NEWBORN_TASKS } from '../data/newborn'
import { VACCINE_LIST_ID } from '../utils/vaccines'
import { BIRTH_VACCINES, saveBirth, validateBirth, vaccineId, type BirthInput } from '../utils/birth'
import { toast } from '../utils/overlay'

const BLOOD = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', '0+', '0−']
const DELIVERY: { id: DeliveryType; label: string }[] = [
  { id: 'vaginal', label: 'Vaginal' },
  { id: 'instrumental', label: 'Instrumental' },
  { id: 'cesarea', label: 'Cesárea' },
]
const HOSPITAL_TASKS = NEWBORN_TASKS.filter(t => t.category === 'hospital' && t.id !== 'informe')

function toLocalInput(d: Date): string {
  const x = new Date(d)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`
}

function num(s: string): number | undefined {
  if (!s.trim()) return undefined
  const n = parseFloat(s.replace(',', '.'))
  return Number.isNaN(n) ? undefined : n
}

const str = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','))

export default function Birth() {
  const { profile, isLoading } = useCurrentProfile()
  const tests = useListChecks(profile?.id, NEWBORN_LIST_ID)
  const vaccines = useListChecks(profile?.id, VACCINE_LIST_ID)
  if (isLoading || !profile || !tests || !vaccines) return null
  return <BirthForm key={profile.id} profile={profile}
    initialTests={Object.fromEntries(HOSPITAL_TASKS.map(t => [t.id, { done: tests.has(t.id), note: tests.get(t.id)?.note }]))}
    initialVaccines={Object.fromEntries(BIRTH_VACCINES.map(v => [vaccineId(v), vaccines.has(vaccineId(v))]))} />
}

interface FormProps {
  profile: BabyProfile
  initialTests: BirthInput['tests']
  initialVaccines: BirthInput['vaccines']
}

function BirthForm({ profile, initialTests, initialVaccines }: FormProps) {
  const navigate = useNavigate()
  const b = profile.birth
  const [name, setName] = useState(profile.name)
  const [at, setAt] = useState(() => toLocalInput(b?.at ?? new Date()))
  const [sex, setSex] = useState<BabySex | undefined>(profile.sex)
  const [weight, setWeight] = useState(str(b?.weightG))
  const [length, setLength] = useState(str(b?.lengthCm))
  const [head, setHead] = useState(str(b?.headCm))
  const [weeks, setWeeks] = useState(str(b?.gestationWeeks))
  const [delivery, setDelivery] = useState<DeliveryType | undefined>(b?.delivery)
  const [apgar1, setApgar1] = useState(str(b?.apgar1))
  const [apgar5, setApgar5] = useState(str(b?.apgar5))
  const [hospital, setHospital] = useState(b?.hospital ?? profile.medical?.hospital ?? '')
  const [blood, setBlood] = useState(profile.medical?.bloodType ?? '')
  const [notes, setNotes] = useState(b?.notes ?? '')
  const [tests, setTests] = useState(initialTests)
  const [vaccines, setVaccines] = useState(initialVaccines)
  const [saving, setSaving] = useState(false)

  const isEdit = !!b

  async function handleSave() {
    const input: BirthInput = {
      name,
      sex,
      bloodType: blood || undefined,
      record: {
        at: new Date(at),
        weightG: num(weight),
        lengthCm: num(length),
        headCm: num(head),
        gestationWeeks: num(weeks),
        delivery,
        apgar1: num(apgar1),
        apgar5: num(apgar5),
        hospital: hospital.trim() || undefined,
        notes: notes.trim() || undefined,
      },
      tests,
      vaccines,
    }
    const check = validateBirth(input)
    if (!check.ok) { toast(check.error!); return }
    setSaving(true)
    try {
      await saveBirth(profile, input)
      toast(isEdit ? 'Datos del nacimiento guardados' : `¡Enhorabuena! Bienvenido, ${name.trim()}`)
      if (isEdit) navigate(-1)
      else navigate('/recien-nacido', { replace: true })
    } catch {
      toast('No se ha podido guardar. Vuelve a intentarlo.')
      setSaving(false)
    }
  }

  const field = (label: string, value: string, set: (v: string) => void, placeholder: string, unit?: string) => (
    <div>
      <label htmlFor={`birth-${label}`} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <div className="relative">
        <input id={`birth-${label}`} inputMode="decimal" value={value} onChange={e => set(e.target.value)} placeholder={placeholder} className={`${inputCls} text-base ${unit ? 'pr-10' : ''}`} />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">{unit}</span>}
      </div>
    </div>
  )

  return (
    <div className="pb-28">
      <BackHeader title={isEdit ? 'Datos del nacimiento' : '¡Ya ha nacido!'}
        subtitle={isEdit ? profile.name : 'Apunta lo del informe del hospital. Lo que no sepas, déjalo en blanco y complétalo luego.'} />

      <div className="px-5 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">Nombre</label>
          <input id="name" value={name} onChange={e => setName(e.target.value)} className={`${inputCls} text-base`} />
        </div>
        <div>
          <label htmlFor="at" className="block text-sm font-medium text-gray-700 mb-1.5">Día y hora exactos</label>
          <input id="at" type="datetime-local" value={at} onChange={e => setAt(e.target.value)} className={`${inputCls} text-base`} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(['boy', 'girl'] as const).map(k => (
            <button key={k} type="button" onClick={() => setSex(k)}
              className={`rounded-xl py-3 text-sm font-semibold border ${sex === k ? 'bg-tinta-600 border-tinta-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
              {k === 'boy' ? 'Niño' : 'Niña'}
            </button>
          ))}
        </div>

        <SectionLabel>Medidas al nacer</SectionLabel>
        <div className="grid grid-cols-3 gap-2 -mt-1">
          {field('Peso', weight, setWeight, '3420', 'g')}
          {field('Talla', length, setLength, '50', 'cm')}
          {field('Cabeza', head, setHead, '34,5', 'cm')}
        </div>

        <SectionLabel>El parto</SectionLabel>
        <div className="grid grid-cols-3 gap-2 -mt-1">
          {DELIVERY.map(d => (
            <button key={d.id} type="button" onClick={() => setDelivery(v => v === d.id ? undefined : d.id)}
              className={`rounded-xl py-2.5 text-sm border ${delivery === d.id ? 'bg-tinta-50 border-tinta-300 text-tinta-800 font-semibold' : 'bg-white border-gray-200 text-gray-700'}`}>
              {d.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {field('Semanas', weeks, setWeeks, '40')}
          {field('Apgar 1′', apgar1, setApgar1, '9')}
          {field('Apgar 5′', apgar5, setApgar5, '10')}
        </div>
        <div>
          <label htmlFor="hospital" className="block text-sm font-medium text-gray-700 mb-1.5">Hospital</label>
          <input id="hospital" value={hospital} onChange={e => setHospital(e.target.value)} placeholder="Hospital donde ha nacido" className={`${inputCls} text-base`} />
        </div>
        <div>
          <p className="block text-sm font-medium text-gray-700 mb-1.5">Grupo sanguíneo del bebé (si os lo dicen)</p>
          <div className="grid grid-cols-4 gap-2">
            {BLOOD.map(x => (
              <button key={x} type="button" onClick={() => setBlood(v => v === x ? '' : x)}
                className={`rounded-xl py-2.5 text-sm font-semibold border ${blood === x ? 'bg-tinta-600 border-tinta-600 text-white' : 'bg-white border-gray-200 text-gray-700'}`}>
                {x}
              </button>
            ))}
          </div>
        </div>

        <SectionLabel>Vacunas al nacer</SectionLabel>
        <ul className="space-y-2 -mt-1">
          {BIRTH_VACCINES.map(v => {
            const id = vaccineId(v)
            return (
              <CheckRow key={id} checked={vaccines[id] ?? false} title={v.name} detail={v.description}
                onToggle={() => setVaccines(s => ({ ...s, [id]: !s[id] }))} />
            )
          })}
        </ul>

        <SectionLabel>Pruebas y cuidados en el hospital</SectionLabel>
        <ul className="space-y-2 -mt-1">
          {HOSPITAL_TASKS.map(t => {
            const s = tests[t.id] ?? { done: false }
            return (
              <CheckRow key={t.id} checked={s.done} title={t.title} detail={t.detail}
                onToggle={() => setTests(x => ({ ...x, [t.id]: { ...s, done: !s.done } }))}>
                {t.hasResult && s.done && (
                  <input value={s.note ?? ''} onChange={e => setTests(x => ({ ...x, [t.id]: { ...s, note: e.target.value } }))}
                    placeholder="Resultado (normal, repetir…)" className={`${inputCls} mt-2`} />
                )}
              </CheckRow>
            )
          })}
        </ul>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1.5">Notas</label>
          <textarea id="notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cómo fue, quién estaba, lo primero que hizo…" className={`${inputCls} text-base`} />
        </div>

        <button onClick={handleSave} disabled={saving} className={primaryBtn}>
          {isEdit ? 'Guardar cambios' : `Guardar y ver qué toca ahora`}
        </button>
      </div>
    </div>
  )
}

interface CheckRowProps {
  checked: boolean
  title: string
  detail: string
  onToggle: () => void
  children?: React.ReactNode
}

function CheckRow({ checked, title, detail, onToggle, children }: CheckRowProps) {
  return (
    <li className="bg-white border border-gray-100 rounded-2xl p-4 flex items-start gap-3">
      <button type="button" onClick={onToggle} aria-label={checked ? `${title}: hecho` : `${title}: pendiente`} aria-pressed={checked} className="-m-2 p-2 shrink-0">
        <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm ${checked ? 'bg-green-600 border-green-600 text-white' : 'border-gray-300 bg-white'}`}>
          {checked ? '✓' : ''}
        </span>
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{detail}</p>
        {children}
      </div>
    </li>
  )
}
