import { db } from '../db/db'
import { SYNC_TABLES, markRemote, type SyncChange, type SyncTable } from './changeLog'
import { observeStamp } from './clock'
import { decodeRecord, encodeRow, planMerge, recordKey, type LocalState, type SyncRecord } from './merge'

// Parte local del motor: qué subir, cómo aplicar lo que baja. El transporte
// (servidor, cifrado, realtime) se enchufa encima de estas tres funciones.

type Row = Record<string, unknown> & { uid?: string }

const tables = () => SYNC_TABLES.map(t => db.table(t))

async function uidMaps() {
  const [profiles, entries] = await Promise.all([db.profiles.toArray(), db.diaryEntries.toArray()])
  return {
    profileUid: new Map(profiles.map(p => [p.id!, p.uid!])),
    diaryUid: new Map(entries.map(e => [e.id!, e.uid!])),
  }
}

/** Registros a subir: el estado actual de cada fila con cambios pendientes. */
export async function collectOutgoing(): Promise<{ records: SyncRecord[]; changes: SyncChange[] }> {
  return db.transaction('r', [...tables(), db.syncChanges], async () => {
    const changes = await db.syncChanges.toArray()
    const maps = await uidMaps()
    const refs = { profileUid: (id: number) => maps.profileUid.get(id), diaryUid: (id: number) => maps.diaryUid.get(id) }
    const records: SyncRecord[] = []
    for (const c of changes) {
      if (c.op === 'delete') {
        records.push({ tbl: c.tbl, uid: c.uid, updatedAt: c.at, updatedBy: c.by, deleted: true })
        continue
      }
      const row = await db.table(c.tbl).where('uid').equals(c.uid).first() as Row | undefined
      if (row) records.push(encodeRow(c.tbl, row, refs))
    }
    return { records, changes }
  })
}

/** Tras confirmar la subida: borra lo enviado salvo que haya cambiado entretanto. */
export async function ackOutgoing(sent: SyncChange[]): Promise<void> {
  await db.transaction('rw', db.syncChanges, async () => {
    const current = await db.syncChanges.bulkGet(sent.map(c => [c.tbl, c.uid] as [string, string]))
    const done = sent.filter((c, i) => current[i]?.at === c.at).map(c => [c.tbl, c.uid] as [string, string])
    await db.syncChanges.bulkDelete(done)
  })
}

/** Al activar la sincronización: marca todo lo existente como pendiente de subir. */
export async function queueEverything(): Promise<number> {
  return db.transaction('rw', [db.syncChanges, ...tables()], async () => {
    const all: SyncChange[] = []
    for (const tbl of SYNC_TABLES) {
      const rows = await db.table(tbl).toArray() as (Row & { updatedAt: number; updatedBy: string })[]
      for (const r of rows) if (r.uid) all.push({ tbl, uid: r.uid, op: 'put', at: r.updatedAt, by: r.updatedBy })
    }
    await db.syncChanges.bulkPut(all)
    return all.length
  })
}

/**
 * Aplica registros remotos con "último en escribir gana". Devuelve los que no
 * se pudieron aplicar porque su padre aún no ha llegado.
 */
export async function applyRemote(remote: SyncRecord[]): Promise<{ applied: number; deferred: SyncRecord[] }> {
  return db.transaction('rw', [...tables(), db.syncChanges], async tx => {
    markRemote(tx.idbtrans)

    // uid → id local de los padres, para traducir referencias.
    const [profiles, entries] = await Promise.all([db.profiles.toArray(), db.diaryEntries.toArray()])
    const parentIds: Partial<Record<SyncTable, Map<string, number>>> = {
      profiles: new Map(profiles.map(p => [p.uid!, p.id!])),
      diaryEntries: new Map(entries.map(e => [e.uid!, e.id!])),
    }

    // Estado local de todos los uids implicados.
    const local = new Map<string, LocalState>()
    const rowByKey = new Map<string, Row>()
    for (const tbl of SYNC_TABLES) {
      const uids = remote.filter(r => r.tbl === tbl).map(r => r.uid)
      if (!uids.length) continue
      const rows = await db.table(tbl).where('uid').anyOf(uids).toArray() as (Row & Partial<LocalState>)[]
      for (const row of rows) {
        const key = recordKey({ tbl, uid: row.uid! })
        rowByKey.set(key, row)
        local.set(key, { updatedAt: row.updatedAt ?? 0, updatedBy: row.updatedBy ?? '', deleted: false })
      }
    }
    const pending = await db.syncChanges.bulkGet(remote.map(r => [r.tbl, r.uid] as [string, string]))
    for (const c of pending) {
      if (c?.op === 'delete' && !local.has(recordKey(c))) local.set(recordKey(c), { updatedAt: c.at, updatedBy: c.by, deleted: true })
    }

    const plan = planMerge(remote, (tbl, uid) => local.get(recordKey({ tbl, uid })))
    const deferred: SyncRecord[] = []
    let applied = 0

    for (const rec of plan) {
      const table = db.table(rec.tbl)
      const existing = rowByKey.get(recordKey(rec))

      if (rec.deleted) {
        if (existing) await table.where('uid').equals(rec.uid).delete()
      } else {
        const row = decodeRecord(rec, {
          profileId: uid => parentIds.profiles!.get(uid),
          diaryId: uid => parentIds.diaryEntries!.get(uid),
        })
        if (!row) { deferred.push(rec); continue }
        if (existing?.id !== undefined) row.id = existing.id
        const key = await table.put(row)
        parentIds[rec.tbl]?.set(rec.uid, key as number)
      }
      observeStamp(rec.updatedAt)
      // Lo remoto ha superado al cambio local pendiente: ya no hay que subirlo.
      await db.syncChanges.delete([rec.tbl, rec.uid])
      applied++
    }
    return { applied, deferred }
  })
}
