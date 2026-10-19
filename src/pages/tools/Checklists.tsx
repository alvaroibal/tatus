import { useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../../hooks/useCurrentProfile'
import { db } from '../../db/db'
import { CHECKLISTS, checkKey, getChecklist } from '../../data/checklists'
import { BackHeader, LinkRow } from '../../components/ui'

function useDoneKeys(profileId: number | undefined) {
  return useLiveQuery(async () => {
    if (!profileId) return new Set<string>()
    const rows = await db.checks.where('profileId').equals(profileId).toArray()
    return new Set(rows.filter(r => r.done).map(r => r.key))
  }, [profileId])
}

export function ChecklistIndex() {
  const navigate = useNavigate()
  const { profile } = useCurrentProfile()
  const done = useDoneKeys(profile?.id)

  return (
    <div className="pb-24">
      <BackHeader title="Checklists" subtitle="Listas para no olvidar nada" />
      <div className="px-5 space-y-2">
        {CHECKLISTS.map(c => {
          const total = c.groups.reduce((s, g) => s + g.items.length, 0)
          const n = profile?.id && done
            ? c.groups.reduce((s, g) => s + g.items.filter(i => done.has(checkKey(profile.id!, c.id, i.id))).length, 0)
            : 0
          return (
            <LinkRow key={c.id} emoji={c.emoji} title={c.title} subtitle={`${n}/${total} · ${c.description}`}
              onClick={() => navigate(`/herramientas/checklist/${c.id}`)} />
          )
        })}
      </div>
    </div>
  )
}

export function ChecklistDetail() {
  const { id } = useParams()
  const { profile } = useCurrentProfile()
  const done = useDoneKeys(profile?.id)
  const list = id ? getChecklist(id) : undefined

  if (!list || !profile?.id) return null
  const pid = profile.id

  async function toggle(itemId: string) {
    const key = checkKey(pid, list!.id, itemId)
    await db.checks.put({ key, profileId: pid, done: !done?.has(key) })
  }

  const total = list.groups.reduce((s, g) => s + g.items.length, 0)
  const n = list.groups.reduce((s, g) => s + g.items.filter(i => done?.has(checkKey(pid, list.id, i.id))).length, 0)

  return (
    <div className="pb-24">
      <BackHeader title={`${list.emoji} ${list.title}`} subtitle={list.description} />
      <div className="px-5 mb-5">
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${total ? (n / total) * 100 : 0}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1.5">{n} de {total} hechos</p>
      </div>
      {list.groups.map(g => (
        <section key={g.title} className="px-5 mb-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">{g.title}</p>
          <ul className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50">
            {g.items.map(i => {
              const checked = done?.has(checkKey(pid, list.id, i.id)) ?? false
              return (
                <li key={i.id}>
                  <button onClick={() => toggle(i.id)} className="w-full flex items-start gap-3 px-4 py-3 text-left">
                    <span className={`mt-0.5 w-5 h-5 rounded-md border-2 shrink-0 flex items-center justify-center text-xs ${
                      checked ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'
                    }`}>{checked ? '✓' : ''}</span>
                    <span className={`text-sm ${checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{i.text}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
