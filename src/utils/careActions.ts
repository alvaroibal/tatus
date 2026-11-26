import { db } from '../db/db'

/** Empieza un temporizador de pecho o sueño cerrando el que hubiera abierto del mismo tipo. */
export async function startCareTimer(profileId: number, type: 'breast' | 'sleep', side?: 'L' | 'R'): Promise<number> {
  return db.transaction('rw', db.careLogs, async () => {
    const open = await db.careLogs.where('profileId').equals(profileId)
      .filter(l => l.type === type && !l.end).toArray()
    const now = new Date()
    for (const r of open) await db.careLogs.update(r.id!, { end: now })
    return db.careLogs.add({ profileId, type, side, start: now }) as Promise<number>
  })
}
