import { liveQuery, type Subscription } from 'dexie'
import { db, type SyncState } from '../db/db'
import type { SyncChange } from './changeLog'
import { deriveKeys, newSeed, openRecord, recordId, sealRecord, type SyncKeys } from './crypto'
import { ackOutgoing, applyRemote, collectOutgoing, queueEverything } from './engine'
import { getSyncState, saveSyncState } from './keyStore'
import { recordKey, type SyncRecord } from './merge'
import { isTransportError, TransportError, MAX_BATCH, MAX_BLOB_BYTES, type PullRow, type PushRow, type Transport } from './transport'

// Bucle de sincronización (Blueprint → Arquitectura → runner.ts):
//   subir (cifrar → fotos a Storage → push → ack) → bajar (pull hasta vaciar →
//   descifrar → applyRemote con reintentos → cursor) → estado.
// Nunca se registra en consola ni en lastError la seed, las llaves ni contenido.

export interface SyncResult {
  status: 'ok' | 'off' | 'unavailable' | 'busy' | 'error'
  pushed: number     // registros subidos
  pulled: number     // filas recibidas del servidor
  applied: number    // registros remotos aplicados en local
  discarded: number  // filas recibidas que no se pudieron abrir o no cuadran (se descartan)
  deferred: number   // registros cuyo padre aún no ha llegado (se reintentan en el siguiente ciclo)
  tooLarge: number   // registros que superan 1 MB cifrados (no se suben)
}

const EMPTY: SyncResult = { status: 'ok', pushed: 0, pulled: 0, applied: 0, discarded: 0, deferred: 0, tooLarge: 0 }
const APPLY_PASSES = 3
const DEBOUNCE_MS = 5000

// --- Mensajes (genéricos: nunca llevan datos) ---------------------------------

const MESSAGES = {
  network: 'No hay conexión con el servidor. Se volverá a intentar.',
  denied: 'El servidor no reconoce este móvil en la familia.',
  locked: 'Demasiados intentos. Prueba más tarde.',
  quota: 'El archivo de la familia ha llegado al límite del servidor.',
  tooLarge: 'Una foto es demasiado grande para sincronizarse.',
  generic: 'No se pudo sincronizar. Se volverá a intentar.',
} as const

/** Mensaje en español para mostrar al usuario a partir de cualquier error del bucle. */
export function syncErrorMessage(e: unknown): string {
  if (!isTransportError(e)) return MESSAGES.generic
  if (e.code === 'network' || e.code === 'denied' || e.code === 'locked' || e.code === 'quota') return MESSAGES[e.code]
  return MESSAGES.generic
}

// --- Transporte ------------------------------------------------------------------

let injected: Transport | null = null
let supabase: Promise<Transport | null> | null = null

/** Para tests (MemoryTransport). Con null se vuelve al de Supabase. */
export function setTransport(t: Transport | null): void {
  injected = t
}

const envConfigured = () => !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

/** Sin VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY la sincronización no está disponible. */
export function isSyncAvailable(): boolean {
  return injected !== null || envConfigured()
}

async function getTransport(): Promise<Transport | null> {
  if (injected) return injected
  if (!envConfigured()) return null
  supabase ??= import('./supabaseTransport').then(m => m.createSupabaseTransport())
  try {
    return await supabase
  } catch {
    supabase = null // el chunk no se pudo descargar: se reintenta en el siguiente ciclo
    throw new TransportError('network')
  }
}

async function requireTransport(): Promise<Transport> {
  const t = await getTransport()
  if (!t) throw new Error('Sincronización no disponible')
  return t
}

const toHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('')

async function sha256Hex(b: Uint8Array<ArrayBuffer>): Promise<string> {
  return toHex(new Uint8Array(await crypto.subtle.digest('SHA-256', b)))
}

/**
 * Cambia campos del estado sin tocar la seed. Con get + put y no con update():
 * update() clona el objeto y en los tests (jsdom) perdía el Uint8Array de la seed.
 */
async function patchState(changes: Partial<Omit<SyncState, 'id' | 'seed'>>): Promise<void> {
  await db.transaction('rw', db.syncState, async () => {
    const state = await db.syncState.get('self')
    if (state) await db.syncState.put({ ...state, ...changes })
  })
}

// --- Subir -------------------------------------------------------------------------

/** Cifra un registro. Las fotos van a Storage y en la fila solo queda blob_path. null = supera 1 MB. */
async function sealRow(t: Transport, keys: SyncKeys, rec: SyncRecord): Promise<PushRow | null> {
  const rid = await recordId(keys.ridKey, rec.tbl, rec.uid)
  const payload = await sealRecord(keys, rid, rec)
  if (payload.length > MAX_BLOB_BYTES) return null
  const base = { rid, version: rec.updatedAt, version_by: rec.updatedBy }
  if (rec.tbl !== 'entryPhotos') return { ...base, payload, blob_path: null }
  const path = `${keys.spaceId}/${rid}`
  await t.putBlob(path, payload)
  return { ...base, payload: null, blob_path: path }
}

async function upload(t: Transport, keys: SyncKeys): Promise<{ pushed: number; tooLarge: number }> {
  const { records, changes } = await collectOutgoing()
  const changeByKey = new Map(changes.map(c => [recordKey(c), c]))
  let pushed = 0
  let tooLarge = 0
  for (let i = 0; i < records.length; i += MAX_BATCH) {
    const rows: PushRow[] = []
    const sent: SyncChange[] = []
    for (const rec of records.slice(i, i + MAX_BATCH)) {
      const row = await sealRow(t, keys, rec)
      if (!row) { tooLarge++; continue } // se queda pendiente: no se marca como subido
      rows.push(row)
      const change = changeByKey.get(recordKey(rec))
      if (change) sent.push(change)
    }
    if (rows.length) await t.push(keys.spaceId, rows)
    await ackOutgoing(sent) // solo tras un push correcto
    pushed += rows.length
  }
  // Cambios cuya fila ya no existe: no hay nada que subir.
  const withRecord = new Set(records.map(recordKey))
  const gone = changes.filter(c => !withRecord.has(recordKey(c)))
  if (gone.length) await ackOutgoing(gone)
  return { pushed, tooLarge }
}

// --- Bajar -------------------------------------------------------------------------

/** Descifra una fila del servidor. null = no se puede abrir o no cuadra (se descarta). */
async function openRow(t: Transport, keys: SyncKeys, row: PullRow): Promise<SyncRecord | null> {
  let payload = row.payload
  if (row.blob_path !== null) {
    // Un blob solo puede vivir en el hueco de su propio registro dentro de la familia.
    if (row.blob_path !== `${keys.spaceId}/${row.rid}`) return null
    try {
      payload = await t.getBlob(row.blob_path)
    } catch (e) {
      if (isTransportError(e) && e.code === 'network') throw e
      return null
    }
  }
  if (payload === null) return null
  let rec: SyncRecord
  try {
    rec = await openRecord(keys, row.rid, payload)
  } catch {
    return null
  }
  // Se usan los valores de dentro; el rid tiene que corresponder a (tbl, uid) descifrados.
  if (await recordId(keys.ridKey, rec.tbl, rec.uid) !== row.rid) return null
  return rec
}

interface Opened { rec: SyncRecord; seq: number }

/** applyRemote reintentando los aplazados (hijos antes que padres) hasta APPLY_PASSES pasadas. */
async function applyWithRetries(records: SyncRecord[]): Promise<{ applied: number; deferred: Set<SyncRecord> }> {
  let pending = records
  let applied = 0
  for (let pass = 0; pass < APPLY_PASSES && pending.length; pass++) {
    const res = await applyRemote(pending)
    applied += res.applied
    pending = res.deferred
  }
  return { applied, deferred: new Set(pending) }
}

async function download(t: Transport, keys: SyncKeys, cursor: number): Promise<Pick<SyncResult, 'pulled' | 'applied' | 'discarded' | 'deferred'>> {
  let after = cursor
  let carry: Opened[] = [] // aplazados que se reintentan con la página siguiente
  let pulled = 0
  let applied = 0
  let discarded = 0
  for (;;) {
    const rows = await t.pull(keys.spaceId, after, MAX_BATCH)
    if (!rows.length) break
    pulled += rows.length
    const opened: Opened[] = []
    for (const row of rows) {
      const rec = await openRow(t, keys, row)
      if (rec) opened.push({ rec, seq: row.seq })
      else discarded++
    }
    after = rows[rows.length - 1].seq

    const batch = [...carry, ...opened]
    const res = await applyWithRetries(batch.map(o => o.rec))
    applied += res.applied
    carry = batch.filter(o => res.deferred.has(o.rec))
    // El cursor no pasa de un aplazado: el siguiente ciclo lo vuelve a bajar.
    const saved = carry.length ? Math.min(...carry.map(o => o.seq)) - 1 : after
    await patchState({ cursor: saved })
  }
  return { pulled, applied, discarded, deferred: carry.length }
}

// --- Ciclo -------------------------------------------------------------------------

async function cycle(): Promise<SyncResult> {
  try {
    const state = await getSyncState()
    if (!state?.enabled) return { ...EMPTY, status: 'off' }
    const t = await getTransport()
    if (!t) return { ...EMPTY, status: 'unavailable' }

    const keys = await deriveKeys(new Uint8Array(state.seed))
    await t.signIn()
    const up = await upload(t, keys)
    const down = await download(t, keys, state.cursor)
    await patchState({ lastSyncAt: Date.now(), lastError: up.tooLarge ? MESSAGES.tooLarge : undefined })
    return { ...EMPTY, ...up, ...down }
  } catch (e) {
    try {
      await patchState({ lastError: syncErrorMessage(e) })
    } catch {
      // Sin base de datos no hay dónde guardar el error; el resultado ya lo indica.
    }
    return { ...EMPTY, status: 'error' }
  }
}

// --- Exclusión: un solo syncNow a la vez ----------------------------------------

let inflight: Promise<SyncResult> | null = null
const listeners = new Set<() => void>()
const notify = () => listeners.forEach(l => l())

/** Para useSyncStatus: avisa al empezar y al terminar un ciclo. */
export function subscribeSyncing(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function isSyncing(): boolean {
  return inflight !== null
}

function exclusive(): Promise<SyncResult> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (!locks?.request) return cycle()
  // Entre pestañas: si otra ya sincroniza, esta no espera ni repite.
  return locks.request('tatus-sync', { ifAvailable: true }, lock => lock ? cycle() : { ...EMPTY, status: 'busy' as const })
}

/** Sincroniza ahora. Si ya hay un ciclo en marcha, devuelve ese mismo. Nunca lanza. */
export function syncNow(): Promise<SyncResult> {
  if (inflight) return inflight
  inflight = exclusive().finally(() => {
    inflight = null
    notify()
  })
  notify()
  return inflight
}

// --- Disparadores -----------------------------------------------------------------

let watching: Subscription | null = null
let debounce: ReturnType<typeof setTimeout> | undefined

function onVisibility() {
  if (document.visibilityState === 'visible') void syncNow()
}

/** Arranque: instala los disparadores (una vez) y sincroniza. */
export function startSync(): void {
  if (!watching) {
    document.addEventListener('visibilitychange', onVisibility)
    // Cada escritura local deja en syncChanges una marca `at` mayor que todas las anteriores.
    // Desde 0: una escritura anterior a la primera emisión también dispara
    // (como mucho, un ciclo de más si al arrancar ya había pendientes).
    let lastAt = 0
    watching = liveQuery(() => db.syncChanges.orderBy('at').last()).subscribe({
      next: change => {
        const at = change?.at ?? 0
        if (at <= lastAt) return
        lastAt = at
        clearTimeout(debounce)
        debounce = setTimeout(() => void syncNow(), DEBOUNCE_MS)
      },
      // Si la consulta falla, quedan el arranque, visibilitychange y el botón.
      error: () => { watching = null },
    })
  }
  void syncNow()
}

/** Quita los disparadores (tests; la Fase 6 lo usará para desactivar). */
export function stopSync(): void {
  document.removeEventListener('visibilitychange', onVisibility)
  watching?.unsubscribe()
  watching = null
  clearTimeout(debounce)
}

// --- Activar y unirse (sin UI: las usa la Fase 4) ---------------------------------

/** Crea una familia nueva con una seed nueva, sube todo lo local y deja la sync en marcha. */
export async function enableSync(): Promise<SyncResult> {
  const t = await requireTransport()
  const seed = newSeed()
  const keys = await deriveKeys(seed)
  await t.signIn()
  await t.createSpace(keys.spaceId, await sha256Hex(keys.authSecret as Uint8Array<ArrayBuffer>))
  await saveSyncState({ id: 'self', seed, spaceId: keys.spaceId, cursor: 0, enabled: true })
  await queueEverything()
  startSync()
  return syncNow()
}

/** Une este móvil a la familia de `seed` y descarga todo desde el principio. */
export async function joinSync(seed: Uint8Array): Promise<SyncResult> {
  const t = await requireTransport()
  const own = new Uint8Array(seed)
  const keys = await deriveKeys(own)
  await t.signIn()
  await t.joinSpace(keys.spaceId, toHex(keys.authSecret))
  await saveSyncState({ id: 'self', seed: own, spaceId: keys.spaceId, cursor: 0, enabled: true })
  startSync()
  return syncNow()
}
