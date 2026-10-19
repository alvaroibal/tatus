import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BabyProfile } from '../db/db'
import { FertilitySummary } from '../pages/tools/Fertility'
import { CHECKLISTS, checkKey } from '../data/checklists'
import { useAppConfig, partnerLabel } from '../hooks/useAppConfig'

const TIPS = [
  'El ácido fólico funciona si se toma antes: empezad ya, aunque aún no haya positivo.',
  'Tu salud cuenta: los espermatozoides de dentro de 3 meses se están formando hoy.',
  'Relaciones cada 1-2 días en la ventana fértil es suficiente. Sin presión.',
  'Tardar 6-12 meses es normal. El 80-85 % de las parejas lo consigue en el primer año.',
  'Hablad ahora de permisos, trabajo y cuidados: luego no habrá tiempo.',
  'Haz el curso de primeros auxilios pediátricos antes de que llegue: es una tarde.',
  'Escribe la primera carta del futuro: cuéntale cómo decidisteis buscarle.',
]

export function TryingHome({ profile }: { profile: BabyProfile }) {
  const navigate = useNavigate()
  const partner = partnerLabel(useAppConfig())
  const list = CHECKLISTS.find(c => c.id === 'preconcepcion')!
  const total = list.groups.reduce((s, g) => s + g.items.length, 0)
  const done = useLiveQuery(async () => {
    const rows = await db.checks.where('profileId').equals(profile.id!).toArray()
    const keys = new Set(rows.filter(r => r.done).map(r => r.key))
    return list.groups.reduce((s, g) => s + g.items.filter(i => keys.has(checkKey(profile.id!, list.id, i.id))).length, 0)
  }, [profile.id]) ?? 0
  const [tip] = useState(() => TIPS[Math.floor(Date.now() / 86_400_000) % TIPS.length])

  return (
    <div className="px-5 pt-2 pb-2 space-y-4">
      <div>
        <p className="text-xs font-semibold text-rose-500 uppercase tracking-widest mb-1">Buscando bebé</p>
        <h2 className="text-2xl font-bold text-gray-900 leading-snug">Preparándoos, tú y {partner}</h2>
      </div>

      {profile.lastPeriod ? (
        <button onClick={() => navigate('/herramientas/fertilidad')} className="w-full text-left">
          <FertilitySummary lastPeriod={profile.lastPeriod} cycleLength={profile.cycleLength ?? 28} />
        </button>
      ) : (
        <button onClick={() => navigate('/herramientas/fertilidad')} className="w-full bg-rose-50 border border-rose-100 rounded-2xl p-4 text-left">
          <p className="text-sm font-semibold text-rose-900">Calcula los días fértiles</p>
          <p className="text-xs text-rose-700 mt-1">Introduce la fecha de la última regla y la duración del ciclo →</p>
        </button>
      )}

      <button onClick={() => navigate('/herramientas/checklist/preconcepcion')} className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-left">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-gray-900">🌱 Antes de buscar</p>
          <p className="text-xs text-gray-400">{done}/{total}</p>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full" style={{ width: `${(done / total) * 100}%` }} />
        </div>
      </button>

      <div className="bg-tinta-50 rounded-2xl p-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-tinta-600 mb-2">Consejo de hoy</p>
        <p className="text-sm text-tinta-900 leading-relaxed">{tip}</p>
      </div>

      <button onClick={() => navigate('/herramientas/fecha-parto')} className="w-full bg-tinta-600 text-white rounded-2xl py-4 text-sm font-semibold">
        🎉 ¡Positivo! Empezar el embarazo
      </button>
    </div>
  )
}
