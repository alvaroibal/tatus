import type { DBCore, DBCoreMutateRequest, DBCoreMutateResponse, DBCoreTable, DBCoreTransaction, Middleware } from 'dexie'
import { getDeviceId, newUid, nextStamp } from './clock'

// Tablas que se comparten entre los dos padres. appConfig queda fuera: guarda
// el perfil activo de *este* dispositivo.
export const SYNC_TABLES = [
  'profiles', 'diaryEntries', 'futureLetters', 'growthRecords',
  'careLogs', 'appointments', 'checks', 'entryPhotos',
] as const
export type SyncTable = typeof SYNC_TABLES[number]

export const CHANGES_TABLE = 'syncChanges'

export function isSyncTable(name: string): name is SyncTable {
  return (SYNC_TABLES as readonly string[]).includes(name)
}

/** Campos que añade la sincronización a cada fila compartida. */
export interface SyncMeta {
  uid?: string        // identidad estable entre dispositivos
  updatedAt?: number  // marca de nextStamp() del último cambio
  updatedBy?: string  // deviceId que hizo el último cambio
}

/** Cambio local pendiente de subir. Uno por fila: el último gana. */
export interface SyncChange {
  tbl: SyncTable
  uid: string
  op: 'put' | 'delete'
  at: number
  by: string
}

// Las tablas con clave natural no llevan uid aleatorio: si los dos padres
// apuntan el peso de la semana 10 deben acabar en el mismo registro.
export function naturalUid(tbl: SyncTable, row: Record<string, unknown>, profileUid: string): string | undefined {
  if (tbl === 'growthRecords') return `${profileUid}:${row.week}`
  if (tbl === 'checks') {
    const key = String(row.key)
    return `${profileUid}|${key.slice(key.indexOf('|') + 1)}`
  }
  return undefined
}

const REMOTE_FLAG = '__tatusRemote'

/** Las escrituras que vienen del otro dispositivo no se registran ni se re-sellan. */
export function markRemote(idbtrans: unknown): void {
  (idbtrans as Record<string, boolean>)[REMOTE_FLAG] = true
}

function isRemote(trans: DBCoreTransaction): boolean {
  return !!(trans as unknown as Record<string, boolean>)[REMOTE_FLAG]
}

type Row = Record<string, unknown> & SyncMeta

// Ojo: aquí no se usa async/await. Las capas de Dexie por debajo (hooks,
// caché de liveQuery) dependen de su "zona" (PSD), que solo se conserva
// encadenando con .then sobre las promesas que devuelve el propio DBCore.

/** Rellena uid en `values` (en sitio). */
function resolveUids(down: DBCore, table: DBCoreTable, tbl: SyncTable, req: DBCoreMutateRequest & { type: 'add' | 'put' }, values: Row[]): PromiseLike<unknown> {
  const trans = req.trans
  if (tbl === 'growthRecords' || tbl === 'checks') {
    const ids = [...new Set(values.map(v => v.profileId).filter(id => id !== undefined))] as number[]
    return down.table('profiles').getMany({ trans, keys: ids }).then((rows: (Row | undefined)[]) => {
      const byId = new Map<unknown, string>(ids.map((id, i) => [id, rows[i]?.uid ?? `p${id}`]))
      for (const v of values) v.uid = naturalUid(tbl, v, byId.get(v.profileId)!)
    })
  }

  // Un put sin uid sobre una fila existente conserva el uid que ya tenía.
  const pk = table.schema.primaryKey
  const missing = values
    .map((v, i) => ({ i, key: req.keys?.[i] ?? pk.extractKey?.(v) }))
    .filter(({ i, key }) => !values[i].uid && key !== undefined)
  return table.getMany({ trans, keys: missing.map(m => m.key) }).then((existing: (Row | undefined)[]) => {
    missing.forEach(({ i }, j) => { if (existing[j]?.uid) values[i].uid = existing[j]!.uid })
    for (const v of values) v.uid ??= newUid()
  })
}

function withLog(down: DBCore, trans: DBCoreTransaction, res: DBCoreMutateResponse, changes: SyncChange[]): DBCoreMutateResponse | PromiseLike<DBCoreMutateResponse> {
  if (!changes.length) return res
  return down.table(CHANGES_TABLE).mutate({ type: 'put', trans, values: changes }).then(() => res)
}

function mutate(down: DBCore, table: DBCoreTable, tbl: SyncTable, req: DBCoreMutateRequest): Promise<DBCoreMutateResponse> {
  if (isRemote(req.trans)) return table.mutate(req)
  const by = getDeviceId()

  if (req.type === 'add' || req.type === 'put') {
    const at = nextStamp()
    const meta = { updatedAt: at, updatedBy: by }
    const values: Row[] = req.values.map(v => ({ ...(v as Row), ...meta }))
    return resolveUids(down, table, tbl, req, values).then(() => {
      const next = { ...req, values } as DBCoreMutateRequest
      // Mantener coherente la caché optimista de liveQuery.
      if (next.type === 'put') {
        if (next.changeSpec) next.changeSpec = { ...next.changeSpec, ...meta }
        if (next.updates) next.updates = { keys: next.updates.keys, changeSpecs: next.updates.changeSpecs.map(c => ({ ...c, ...meta })) }
      }
      return table.mutate(next)
    }).then(res => withLog(down, req.trans, res, values
      .filter((_, i) => !res.failures[i])
      .map(v => ({ tbl, uid: v.uid!, op: 'put' as const, at, by })))) as Promise<DBCoreMutateResponse>
  }

  const doomed: PromiseLike<(Row | undefined)[]> = req.type === 'delete'
    ? table.getMany({ trans: req.trans, keys: req.keys })
    : table.query({ trans: req.trans, values: true, query: { index: table.schema.primaryKey, range: req.range } }).then(r => r.result as Row[])
  return doomed.then(rows => table.mutate(req).then(res => {
    const at = nextStamp()
    return withLog(down, req.trans, res, rows
      .filter((r): r is Row => !!r?.uid)
      .map(r => ({ tbl, uid: r.uid!, op: 'delete' as const, at, by })))
  })) as Promise<DBCoreMutateResponse>
}

export const syncMiddleware: Middleware<DBCore> = {
  stack: 'dbcore',
  name: 'tatusSync',
  create(down) {
    return {
      ...down,
      transaction(stores, mode, options) {
        if (mode === 'readwrite' && stores.some(isSyncTable)) {
          const extra = ['profiles', CHANGES_TABLE].filter(s => !stores.includes(s))
          if (extra.length) stores = [...stores, ...extra]
        }
        return down.transaction(stores, mode, options)
      },
      table(name) {
        const table = down.table(name)
        if (!isSyncTable(name)) return table
        return { ...table, mutate: req => mutate(down, table, name, req) }
      },
    }
  },
}
