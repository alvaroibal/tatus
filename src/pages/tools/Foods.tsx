import { useState } from 'react'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { setCheck, useListChecks } from '../../hooks/useChecks'
import { AlertBox, BackHeader } from '../../components/ui'
import { inputCls } from '../../components/uiHelpers'
import { FOOD_GROUPS, FOOD_LIST_ID } from '../../data/foods'
import { toast } from '../../utils/overlay'

type Open = { id: string; name: string; tip?: string } | null

export default function Foods() {
  const { profile, isLoading } = useCurrentProfile()
  const done = useListChecks(profile?.id, FOOD_LIST_ID)
  const [open, setOpen] = useState<Open>(null)
  if (isLoading || !profile) return null
  const pid = profile.id!

  const total = FOOD_GROUPS.reduce((s, g) => s + g.items.length, 0)
  const tried = done?.size ?? 0
  const reactions = [...(done?.entries() ?? [])].filter(([, c]) => c.note)

  return (
    <div className="pb-24">
      <BackHeader title="Primeros alimentos" subtitle={`${tried} de ${total} probados`} />

      <div className="px-5 mb-5">
        <AlertBox tone="blue">
          Introduce los alérgenos pronto (desde los 6 meses) y de uno en uno, con 2-3 días entre uno nuevo y otro. Retrasarlos no previene alergias.
        </AlertBox>
      </div>

      {reactions.length > 0 && (
        <div className="px-5 mb-5">
          <AlertBox tone="amber">
            <p className="font-semibold mb-1">Reacciones apuntadas</p>
            {reactions.map(([id, c]) => {
              const item = FOOD_GROUPS.flatMap(g => g.items).find(i => i.id === id)
              return <p key={id}>{item?.name}: {c.note}</p>
            })}
          </AlertBox>
        </div>
      )}

      {FOOD_GROUPS.map(g => (
        <section key={g.id} className="px-5 mb-5">
          <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${g.allergen ? 'text-yema-700' : 'text-gray-500'}`}>
            {g.title} · {g.items.filter(i => done?.has(i.id)).length}/{g.items.length}
          </p>
          <div className="flex flex-wrap gap-2">
            {g.items.map(i => {
              const c = done?.get(i.id)
              return (
                <button key={i.id} onClick={() => setOpen(i)}
                  className={`rounded-full px-3.5 py-2 text-sm border ${
                    c?.note ? 'bg-red-50 border-red-200 text-red-800'
                      : c ? 'bg-fase-crecer/15 border-fase-crecer text-gray-900'
                      : 'bg-white border-gray-200 text-gray-700'
                  }`}>
                  {c ? '✓ ' : ''}{i.name}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {open && (
        <FoodSheet key={open.id} item={open} state={done?.get(open.id)} onClose={() => setOpen(null)}
          onSave={async (tried, note) => {
            await setCheck(pid, FOOD_LIST_ID, open.id, tried, { note: tried ? note || undefined : undefined })
            toast(tried ? `${open.name}: apuntado` : `${open.name}: desmarcado`)
            setOpen(null)
          }} />
      )}

      <p className="px-5 text-xs text-gray-500 text-center leading-relaxed mt-4">
        Basado en las recomendaciones de AESAN y la AEP. Ante una reacción (ronchas, hinchazón de labios, vómitos), consulta; si le cuesta respirar, 112.
      </p>
    </div>
  )
}

function FoodSheet({ item, state, onClose, onSave }: {
  item: { name: string; tip?: string }
  state?: { note?: string; date?: Date }
  onClose: () => void
  onSave: (tried: boolean, note: string) => Promise<void>
}) {
  const [note, setNote] = useState(state?.note ?? '')
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button aria-label="Cerrar" className="absolute inset-0 bg-tinta-900/40" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-3">
        <h2 className="text-lg font-bold text-gray-900">{item.name}</h2>
        {item.tip && <p className="text-sm text-gray-600 leading-relaxed">{item.tip}</p>}
        {state?.date && <p className="text-xs text-gray-500">Probado el {new Date(state.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>}
        <div>
          <label htmlFor="reaction" className="block text-sm font-medium text-gray-700 mb-1.5">¿Alguna reacción? (opcional)</label>
          <input id="reaction" value={note} onChange={e => setNote(e.target.value)} placeholder="ej. ronchas alrededor de la boca" className={`${inputCls} text-base`} />
        </div>
        <button onClick={() => onSave(true, note)} className="w-full bg-tinta-600 text-white rounded-xl py-3.5 text-base font-semibold">
          {state ? 'Guardar' : 'Lo ha probado'}
        </button>
        {state && <button onClick={() => onSave(false, '')} className="w-full py-3 text-base text-gray-500">Desmarcar</button>}
      </div>
    </div>
  )
}
