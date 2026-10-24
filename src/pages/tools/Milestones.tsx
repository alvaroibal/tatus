import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { setCheck, useListChecks } from '../../hooks/useChecks'
import { db } from '../../db/db'
import { AlertBox, BackHeader, Fold } from '../../components/ui'
import { AREA_LABELS, MILESTONES, MILESTONE_LIST_ID, currentMilestoneGroup, nextMilestoneGroup, type MilestoneGroup } from '../../data/milestones'
import { ageInMonths, formatAge } from '../../utils/age'
import { toast } from '../../utils/overlay'

export default function Milestones() {
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const done = useListChecks(profile?.id, MILESTONE_LIST_ID)
  if (isLoading || !profile) return null

  if (profile.phase === 'trying' || currentWeek < 0) {
    return (
      <div className="pb-24">
        <BackHeader title="Hitos del desarrollo" />
        <p className="px-5 text-sm text-gray-500 text-center py-12">Los verás cuando nazca {profile.name}.</p>
      </div>
    )
  }

  const pid = profile.id!
  const months = ageInMonths(profile.birthDate)
  const current = currentMilestoneGroup(months)
  const next = nextMilestoneGroup(months)
  const past = MILESTONES.filter(g => current && g.months < current.months).reverse()

  async function toggle(itemId: string, text: string, checked: boolean) {
    await setCheck(pid, MILESTONE_LIST_ID, itemId, !checked)
    if (!checked) {
      toast('¡Apuntado!', {
        label: 'Al diario',
        run: async () => {
          await db.diaryEntries.add({ profileId: pid, date: new Date(), week: currentWeek, text, milestone: true })
          toast('Guardado como primera vez en el diario')
        },
      })
    }
  }

  function group(g: MilestoneGroup) {
    const areas = [...new Set(g.items.map(i => i.area))]
    return (
      <div className="space-y-4 px-4 pb-3">
        {areas.map(a => (
          <div key={a}>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 mb-1">{AREA_LABELS[a]}</p>
            <ul>
              {g.items.filter(i => i.area === a).map(i => {
                const c = done?.get(i.id)
                return (
                  <li key={i.id}>
                    <button onClick={() => toggle(i.id, i.text, !!c)} className="w-full flex items-start gap-3 py-2.5 text-left">
                      <span className={`mt-0.5 w-6 h-6 rounded-full border-2 shrink-0 flex items-center justify-center ${c ? 'bg-fase-crecer border-fase-crecer text-white' : 'border-gray-300'}`}>
                        {c ? '✓' : ''}
                      </span>
                      <span className="flex-1">
                        <span className={`block text-[15px] ${c ? 'text-gray-500' : 'text-gray-900'}`}>{i.text}</span>
                        {c?.date && <span className="block text-xs text-gray-500 mt-0.5">{new Date(c.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  const count = (g: MilestoneGroup) => g.items.filter(i => done?.has(i.id)).length

  return (
    <div className="pb-24">
      <BackHeader title="Hitos del desarrollo" subtitle={`${profile.name} · ${formatAge(profile.birthDate)}`} />

      <div className="px-5 mb-4">
        <AlertBox tone="blue">
          Son cosas que hacen <strong>3 de cada 4 niños</strong> a esa edad. Cada niño va a su ritmo: si a su edad no hace varias, o <strong>pierde algo que ya hacía</strong>, coméntalo con el pediatra.
        </AlertBox>
      </div>

      {current ? (
        <>
          <p className="px-5 text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">A los {current.label} · {count(current)}/{current.items.length}</p>
          <div className="mx-5 mb-5 bg-white border border-gray-100 rounded-2xl pt-3">{group(current)}</div>
        </>
      ) : (
        <p className="px-5 text-sm text-gray-600 mb-5">Los primeros hitos llegan a los 2 meses. Mientras tanto, mira qué viene.</p>
      )}

      {next && (
        <Fold title={`Lo que viene: ${next.label}`}>{group(next)}</Fold>
      )}
      {past.map(g => (
        <Fold key={g.months} title={`${g.label} · ${count(g)}/${g.items.length}`}>{group(g)}</Fold>
      ))}

      <p className="px-5 text-xs text-gray-500 text-center leading-relaxed mt-4">
        Adaptado de «Learn the Signs. Act Early» (CDC/AAP, revisión 2022). No es una prueba diagnóstica.
      </p>
    </div>
  )
}
