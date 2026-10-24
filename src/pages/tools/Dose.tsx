import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { db } from '../../db/db'
import { AlertBox, BackHeader } from '../../components/ui'
import { inputCls } from '../../components/uiHelpers'
import { ageInMonths } from '../../utils/age'

/**
 * Tablas de dosificación por peso tal como aparecen en los prospectos de los productos
 * pediátricos más comunes (CIMA, AEMPS). Es información del prospecto, no un cálculo propio:
 * la app solo resalta la fila que corresponde al peso.
 */
interface Band { min: number; max: number; ml: string; note?: string }
interface Product {
  id: string
  name: string
  every: string
  bands: Band[]
}

const PARACETAMOL_BANDS: Band[] = Array.from({ length: 18 }, (_, i) => {
  const kg = i + 3
  return { min: kg, max: kg + 0.99, ml: `${String(Number((kg * 0.15).toFixed(2))).replace('.', ',')} ml` }
})

const PRODUCTS: Product[] = [
  {
    id: 'para100',
    name: 'Paracetamol 100 mg/ml solución oral (gotas)',
    every: '15 mg/kg cada 6 horas. Máximo 4 tomas en 24 h.',
    bands: PARACETAMOL_BANDS,
  },
  {
    id: 'ibu20',
    name: 'Ibuprofeno 20 mg/ml suspensión oral',
    every: 'Cada 8 horas (3 tomas al día; 3-4 entre 6 y 12 meses). Solo desde 3 meses y 5 kg.',
    bands: [
      { min: 5, max: 7.6, ml: '2,5 ml', note: '3-6 meses' },
      { min: 7.7, max: 9.99, ml: '2,5 ml', note: '6-12 meses' },
      { min: 10, max: 15.99, ml: '5 ml', note: '1-3 años' },
      { min: 16, max: 20.99, ml: '7,5 ml', note: '4-6 años' },
      { min: 21, max: 29.99, ml: '10 ml', note: '7-9 años' },
      { min: 30, max: 40, ml: '15 ml', note: '10-12 años' },
    ],
  },
  {
    id: 'ibu40',
    name: 'Ibuprofeno 40 mg/ml suspensión oral ("forte")',
    every: 'Cada 8 horas (3 tomas al día). Solo desde 3 meses y 5 kg.',
    bands: [
      { min: 5, max: 7.6, ml: '1,25 ml', note: '3-6 meses' },
      { min: 7.7, max: 9.99, ml: '1,25 ml', note: '6-12 meses' },
      { min: 10, max: 15.99, ml: '2,5 ml', note: '1-3 años' },
      { min: 16, max: 20.99, ml: '3,75 ml', note: '4-6 años' },
      { min: 21, max: 29.99, ml: '5 ml', note: '7-9 años' },
      { min: 30, max: 40, ml: '7,5 ml', note: '10-12 años' },
    ],
  },
]

function bandLabel(product: Product, b: Band): string {
  if (product.id === 'para100') return `${b.min} kg`
  const fmt = (n: number) => String(n).replace('.', ',')
  return `${fmt(b.min)}–${fmt(Math.floor(b.max * 10) / 10)} kg`
}

export default function Dose() {
  const navigate = useNavigate()
  const { profile, currentWeek } = useCurrentProfile()
  const [weightInput, setWeight] = useState<string | null>(null)
  const [productId, setProductId] = useState(PRODUCTS[0].id)

  const lastWeight = useLiveQuery(async () => {
    if (!profile?.id) return undefined
    const recs = (await db.growthRecords.toArray()).filter(r => r.profileId === profile.id && r.weightKg)
    return recs.sort((a, b) => b.week - a.week)[0]
  }, [profile?.id])

  const weight = weightInput ?? (lastWeight?.weightKg ? String(lastWeight.weightKg) : '')
  const kg = parseFloat(weight.replace(',', '.'))
  const months = profile && currentWeek >= 0 ? ageInMonths(profile.birthDate) : null
  const product = PRODUCTS.find(p => p.id === productId)!
  const match = product.bands.find(b => kg >= b.min && kg <= b.max)
  const tooYoung = months !== null && months < 3
  const lastWeightOld = lastWeight && currentWeek - lastWeight.week > 4

  return (
    <div className="pb-24">
      <BackHeader title="Dosis según prospecto" subtitle="Paracetamol e ibuprofeno por peso" />

      <div className="px-5 mb-4 space-y-2">
        <AlertBox>
          <strong>Menores de 3 meses:</strong> ningún medicamento sin indicación médica. La fiebre a esta edad es motivo de urgencias.
        </AlertBox>
        <AlertBox tone="amber">
          Esta es la tabla del prospecto. <strong>Comprueba la concentración (mg/ml) en tu caja</strong> y usa la jeringa del envase. Si el pediatra te dio otra pauta, sigue la suya.
        </AlertBox>
      </div>

      <div className="px-5 mb-4 space-y-3">
        <div>
          <label htmlFor="peso" className="block text-sm font-medium text-gray-700 mb-1.5">Peso actual (kg)</label>
          <input id="peso" type="number" inputMode="decimal" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="ej. 7.5" className={`${inputCls} text-base`} />
          {lastWeightOld && <p className="text-sm text-yema-700 mt-1">El último peso guardado tiene más de un mes: usa uno reciente.</p>}
        </div>
        <div className="space-y-2">
          {PRODUCTS.map(p => (
            <button key={p.id} onClick={() => setProductId(p.id)}
              className={`w-full text-left text-sm rounded-xl px-4 py-3 border ${productId === p.id ? 'bg-tinta-50 border-tinta-300 text-tinta-800 font-semibold' : 'bg-white border-gray-200 text-gray-700'}`}>
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {tooYoung ? (
        <div className="px-5"><AlertBox>Con {months} {months === 1 ? 'mes' : 'meses'}, consulta con el pediatra antes de darle cualquier medicamento.</AlertBox></div>
      ) : (
        <section className="px-5">
          {match && (
            <div className="bg-tinta-600 text-white rounded-2xl p-5 mb-3">
              <p className="text-xs uppercase tracking-widest text-tinta-200 font-semibold">Según el prospecto, para {kg} kg</p>
              <p className="text-4xl font-bold mt-1">{match.ml}</p>
              <p className="text-sm text-tinta-100 mt-2">{product.every}</p>
            </div>
          )}
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">Tabla del prospecto</p>
          <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Peso</th>
                  <th className="px-4 py-2 font-medium">Dosis por toma</th>
                </tr>
              </thead>
              <tbody>
                {product.bands.map(b => (
                  <tr key={b.min} className={`border-b border-gray-50 last:border-0 ${b === match ? 'bg-yema-50 font-semibold' : ''}`}>
                    <td className="px-4 py-2 text-gray-700">
                      {bandLabel(product, b)}
                      {b.note && <span className="text-gray-500 font-normal"> · {b.note}</span>}
                    </td>
                    <td className="px-4 py-2 text-gray-900">{b.ml}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-600 mt-2">{product.every}</p>
          <button onClick={() => navigate('/herramientas/registro')} className="w-full mt-4 bg-white border border-gray-200 rounded-2xl py-3 text-sm text-tinta-600 font-semibold">
            Apuntar la toma en el registro (te avisa de la siguiente) →
          </button>
        </section>
      )}

      <p className="px-5 text-xs text-gray-500 text-center leading-relaxed mt-6">
        Información de los prospectos publicados en CIMA (AEMPS). No es una recomendación personalizada ni sustituye a tu pediatra o farmacéutico.
      </p>
    </div>
  )
}
