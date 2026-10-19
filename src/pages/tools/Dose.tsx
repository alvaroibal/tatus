import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { db } from '../../db/db'
import { AlertBox, BackHeader } from '../../components/ui'
import { inputCls } from '../../components/uiHelpers'
import { ageInMonths } from '../../utils/age'

interface Med {
  id: string
  name: string
  concentration: number // mg/ml
  minMgKg: number
  maxMgKg: number
  maxDailyMgKg: number
  every: string
  minMonths: number
}

const MEDS: Med[] = [
  { id: 'para100', name: 'Paracetamol 100 mg/ml (gotas / solución oral)', concentration: 100, minMgKg: 15, maxMgKg: 15, maxDailyMgKg: 60, every: 'cada 6 horas (máximo 4 dosis en 24 h)', minMonths: 3 },
  { id: 'ibu20', name: 'Ibuprofeno 20 mg/ml (suspensión)', concentration: 20, minMgKg: 5, maxMgKg: 10, maxDailyMgKg: 30, every: 'cada 6-8 horas', minMonths: 3 },
  { id: 'ibu40', name: 'Ibuprofeno 40 mg/ml (suspensión "forte")', concentration: 40, minMgKg: 5, maxMgKg: 10, maxDailyMgKg: 30, every: 'cada 6-8 horas', minMonths: 3 },
]

const round1 = (n: number) => Math.round(n * 10) / 10

export default function Dose() {
  const navigate = useNavigate()
  const { profile, currentWeek } = useCurrentProfile()
  const [weightInput, setWeight] = useState<string | null>(null)
  const [medId, setMedId] = useState(MEDS[0].id)
  const [ack, setAck] = useState(false)

  const lastWeight = useLiveQuery(async () => {
    if (!profile?.id) return undefined
    const recs = (await db.growthRecords.toArray()).filter(r => r.profileId === profile.id && r.weightKg)
    return recs.sort((a, b) => b.week - a.week)[0]
  }, [profile?.id])

  const weight = weightInput ?? (lastWeight?.weightKg ? String(lastWeight.weightKg) : '')

  const months = profile && currentWeek >= 0 ? ageInMonths(profile.birthDate) : null
  const med = MEDS.find(m => m.id === medId)!
  const kg = parseFloat(weight.replace(',', '.'))
  const validKg = kg >= 3 && kg <= 40
  const tooYoung = months !== null && months < med.minMonths

  const minMl = round1((kg * med.minMgKg) / med.concentration)
  const maxMl = round1((kg * med.maxMgKg) / med.concentration)
  const dailyMl = round1((kg * med.maxDailyMgKg) / med.concentration)
  const lastWeightOld = lastWeight && currentWeek - lastWeight.week > 4

  return (
    <div className="pb-24">
      <BackHeader title="Dosis orientativa" subtitle="Paracetamol e ibuprofeno según peso" />

      <div className="px-5 mb-5">
        <AlertBox>
          <strong>Menores de 3 meses:</strong> no des ningún medicamento sin indicación médica. La fiebre a esta edad es motivo de urgencias.
        </AlertBox>
      </div>

      {!ack ? (
        <div className="px-5">
          <div className="bg-white border border-gray-100 rounded-2xl p-4 text-sm text-gray-700 leading-relaxed space-y-2">
            <p>Esta calculadora usa las dosis habituales por kilo de las fichas técnicas. Antes de usarla:</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              <li>Comprueba la <strong>concentración</strong> en la caja (mg/ml). Es el error más frecuente.</li>
              <li>Usa siempre la jeringa dosificadora del propio envase.</li>
              <li>Si tu pediatra te ha dado otra pauta, sigue la suya.</li>
              <li>No combines dos productos con el mismo principio activo.</li>
            </ul>
          </div>
          <button onClick={() => setAck(true)} className="w-full mt-4 bg-tinta-600 text-white rounded-xl py-3 text-sm font-semibold">
            Entendido, continuar
          </button>
        </div>
      ) : (
        <>
          <div className="px-5 mb-5 space-y-3">
            <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Peso actual (kg)</label>
                <input type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="ej. 7.5" className={inputCls} />
                {lastWeightOld && <p className="text-xs text-amber-600 mt-1">El último peso guardado tiene más de un mes. Pésale o usa un peso reciente.</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-500">Medicamento y concentración</label>
                {MEDS.map(m => (
                  <button key={m.id} onClick={() => setMedId(m.id)}
                    className={`w-full text-left text-sm rounded-xl px-3 py-2.5 border ${medId === m.id ? 'bg-tinta-50 border-tinta-200 text-tinta-800 font-semibold' : 'border-gray-200 text-gray-600'}`}>
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {tooYoung ? (
            <div className="px-5"><AlertBox>Con {months} {months === 1 ? 'mes' : 'meses'}, consulta con el pediatra antes de darle este medicamento.</AlertBox></div>
          ) : validKg ? (
            <div className="px-5 mb-5">
              <div className="bg-tinta-600 text-white rounded-2xl p-5">
                <p className="text-xs uppercase tracking-widest text-tinta-200 font-semibold">Dosis por toma</p>
                <p className="text-4xl font-bold mt-1 tabular-nums">
                  {minMl === maxMl ? `${minMl} ml` : `${minMl} – ${maxMl} ml`}
                </p>
                <p className="text-sm text-tinta-100 mt-2">{med.every}</p>
                <p className="text-xs text-tinta-200 mt-3">
                  Máximo {dailyMl} ml en 24 h ({med.maxDailyMgKg} mg/kg/día) · {kg} kg
                </p>
              </div>
              <button onClick={() => navigate('/herramientas/registro')} className="w-full mt-3 bg-white border border-gray-100 rounded-2xl py-3 text-sm text-tinta-600 font-semibold">
                Apuntar la toma en el registro →
              </button>
            </div>
          ) : (
            <p className="px-5 text-sm text-gray-400 text-center">Introduce un peso entre 3 y 40 kg.</p>
          )}

          <div className="px-5 mt-4">
            <AlertBox tone="amber">
              Trata el malestar, no el número del termómetro. Consulta si la fiebre dura más de 48-72 h, está muy decaído, le cuesta respirar, no bebe o aparecen manchas en la piel.
            </AlertBox>
          </div>
        </>
      )}

      <p className="px-5 text-xs text-gray-400 text-center leading-relaxed mt-6">
        Cálculo orientativo basado en fichas técnicas (AEMPS). No sustituye la indicación de tu pediatra o farmacéutico.
      </p>
    </div>
  )
}
