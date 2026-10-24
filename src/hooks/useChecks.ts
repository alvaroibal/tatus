import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CheckState } from '../db/db'
import { checkKey } from '../data/checklists'

/** Estado de los checks de una lista (hitos, alimentos, vacunas…) indexado por itemId. */
export function useListChecks(profileId: number | undefined, listId: string): Map<string, CheckState> | undefined {
  return useLiveQuery(async () => {
    const map = new Map<string, CheckState>()
    if (!profileId) return map
    const prefix = `${profileId}|${listId}|`
    const rows = await db.checks.where('profileId').equals(profileId).toArray()
    for (const r of rows) if (r.done && r.key.startsWith(prefix)) map.set(r.key.slice(prefix.length), r)
    return map
  }, [profileId, listId])
}

export async function setCheck(profileId: number, listId: string, itemId: string, done: boolean, extra: Partial<CheckState> = {}) {
  const key = checkKey(profileId, listId, itemId)
  const prev = await db.checks.get(key)
  await db.checks.put({ ...prev, key, profileId, done, date: done ? (extra.date ?? prev?.date ?? new Date()) : undefined, ...extra })
}
