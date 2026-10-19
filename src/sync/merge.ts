import { SYNC_TABLES, naturalUid, type SyncTable } from './changeLog'

// Lógica pura de sincronización: formato de intercambio y resolución de
// conflictos. No toca Dexie, así se prueba sin base de datos.

/** Lo que viaja entre dispositivos (el servidor solo lo guarda, cifrado). */
export interface SyncRecord {
  tbl: SyncTable
  uid: string
  updatedAt: number
  updatedBy: string
  deleted: boolean
  data?: Record<string, unknown>
}

export interface Version {
  updatedAt: number
  updatedBy: string
}

/** Estado local de un uid: fila viva, o borrado pendiente de subir. */
export interface LocalState extends Version {
  deleted: boolean
}

/** Último en escribir gana; empate (mismo ms) se decide por deviceId para converger. */
export function isNewer(a: Version, b: Version): boolean {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt
  return a.updatedBy > b.updatedBy
}

const TABLE_ORDER = new Map<SyncTable, number>(SYNC_TABLES.map((t, i) => [t, i]))

export const recordKey = (r: { tbl: string; uid: string }) => `${r.tbl}:${r.uid}`

/**
 * Decide qué registros remotos aplicar. Devuelve los ganadores ordenados de
 * padres a hijos (perfil → entrada → foto) para que las referencias existan.
 */
export function planMerge(remote: SyncRecord[], local: (tbl: SyncTable, uid: string) => LocalState | undefined): SyncRecord[] {
  const latest = new Map<string, SyncRecord>()
  for (const r of remote) {
    const prev = latest.get(recordKey(r))
    if (!prev || isNewer(r, prev)) latest.set(recordKey(r), r)
  }

  const apply: SyncRecord[] = []
  for (const r of latest.values()) {
    const mine = local(r.tbl, r.uid)
    if (!mine) {
      if (!r.deleted) apply.push(r)
      continue
    }
    if (!isNewer(r, mine)) continue
    if (r.deleted && mine.deleted) continue
    apply.push(r)
  }
  return apply.sort((a, b) => TABLE_ORDER.get(a.tbl)! - TABLE_ORDER.get(b.tbl)! || a.updatedAt - b.updatedAt)
}

// --- Codec fila ↔ registro -------------------------------------------------
// Los ids numéricos son locales a cada dispositivo; en el registro las
// referencias van por uid.

export interface EncodeRefs {
  profileUid: (id: number) => string | undefined
  diaryUid: (id: number) => string | undefined
}

export interface DecodeRefs {
  profileId: (uid: string) => number | undefined
  diaryId: (uid: string) => number | undefined
}

const META = new Set(['id', 'uid', 'updatedAt', 'updatedBy'])

function encodeValue(v: unknown): unknown {
  return v instanceof Date ? { $d: v.toISOString() } : v
}

function decodeValue(v: unknown): unknown {
  if (v && typeof v === 'object' && '$d' in v && Object.keys(v).length === 1) return new Date((v as { $d: string }).$d)
  return v
}

export function encodeRow(tbl: SyncTable, row: Record<string, unknown>, refs: EncodeRefs): SyncRecord {
  const data: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (META.has(k) || v === undefined) continue
    if (k === 'profileId') data.profileUid = refs.profileUid(v as number)
    else if (k === 'diaryEntryId') data.diaryEntryUid = refs.diaryUid(v as number)
    else if (tbl === 'checks' && k === 'key') data.keyRest = String(v).slice(String(v).indexOf('|') + 1)
    else data[k] = encodeValue(v)
  }
  return {
    tbl,
    uid: row.uid as string,
    updatedAt: row.updatedAt as number,
    updatedBy: row.updatedBy as string,
    deleted: false,
    data,
  }
}

/**
 * Convierte un registro remoto en una fila local (sin `id`). Devuelve null si
 * aún no existe el padre al que apunta (llegará en una pasada posterior).
 */
export function decodeRecord(rec: SyncRecord, refs: DecodeRefs): Record<string, unknown> | null {
  const row: Record<string, unknown> = { uid: rec.uid, updatedAt: rec.updatedAt, updatedBy: rec.updatedBy }
  for (const [k, v] of Object.entries(rec.data ?? {})) {
    if (k === 'profileUid') {
      const id = refs.profileId(v as string)
      if (id === undefined) return null
      row.profileId = id
    } else if (k === 'diaryEntryUid') {
      const id = refs.diaryId(v as string)
      if (id === undefined) return null
      row.diaryEntryId = id
    } else if (k !== 'keyRest') {
      row[k] = decodeValue(v)
    }
  }
  if (rec.tbl === 'checks') row.key = `${row.profileId}|${rec.data?.keyRest}`
  // Las claves naturales se recalculan con el uid del perfil; si no coinciden
  // es que el registro está corrupto o mal formado.
  if (rec.tbl === 'growthRecords' || rec.tbl === 'checks') {
    const expected = naturalUid(rec.tbl, row, String(rec.data?.profileUid))
    if (expected !== rec.uid) return null
  }
  return row
}
