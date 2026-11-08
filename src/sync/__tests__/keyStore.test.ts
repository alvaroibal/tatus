import { describe, it, expect, vi, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import type { SyncState } from '../../db/db'

// Node 26 trae un localStorage global vacío que tapa el de jsdom.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
})

// Esquema tal cual estaba en v5, para simular una instalación existente.
const V5 = {
  profiles: '++id,name,uid',
  diaryEntries: '++id,profileId,date,week,milestone,uid',
  growthRecords: '[profileId+week],date,uid',
  appConfig: 'id',
  futureLetters: '++id,profileId,date,week,uid',
  entryPhotos: '++id,diaryEntryId,uid',
  careLogs: '++id,profileId,start,type,uid',
  appointments: '++id,profileId,date,uid',
  checks: 'key,profileId,uid',
  syncChanges: '[tbl+uid],at',
}

const STATE: SyncState = {
  id: 'self',
  seed: Uint8Array.from({ length: 16 }, (_, i) => i),
  spaceId: '0c903d6246207aa27c5d3faad5ced482',
  cursor: 0,
  enabled: true,
}

// vi.resetModules no recarga dexie, así que el IndexedDB se cambia en
// Dexie.dependencies antes de importar db (que lo captura al crearse).
async function freshModules() {
  vi.resetModules()
  Dexie.dependencies.indexedDB = new IDBFactory()
  Dexie.dependencies.IDBKeyRange = IDBKeyRange
}

beforeEach(async () => {
  localStorage.clear()
  await freshModules()
})

describe('Dexie v6', () => {
  it('migra de v5 a v6 sin perder filas y con syncState vacío', async () => {
    const old = new Dexie('tatus-db')
    old.version(5).stores(V5)
    await old.open()
    await old.table('profiles').add({ name: 'Bebé', birthDate: new Date('2026-09-01'), createdAt: new Date(), uid: 'p1', updatedAt: 1, updatedBy: 'A' })
    await old.table('diaryEntries').add({ profileId: 1, date: new Date(), week: 3, text: 'Hola', milestone: false, uid: 'd1', updatedAt: 1, updatedBy: 'A' })
    await old.table('appConfig').put({ id: 1, activeProfileId: 1 })
    await old.table('syncChanges').put({ tbl: 'diaryEntries', uid: 'd1', op: 'put', at: 1, by: 'A' })
    old.close()

    const { db } = await import('../../db/db')
    await db.open()
    expect(db.verno).toBe(6)
    expect(await db.profiles.toArray()).toEqual([expect.objectContaining({ id: 1, name: 'Bebé', uid: 'p1' })])
    expect(await db.diaryEntries.toArray()).toEqual([expect.objectContaining({ text: 'Hola', uid: 'd1' })])
    expect(await db.appConfig.get(1)).toEqual({ id: 1, activeProfileId: 1 })
    expect(await db.syncChanges.count()).toBe(1)
    expect(await db.syncState.count()).toBe(0)
  })

  it('syncState no es una tabla sincronizable', async () => {
    const { SYNC_TABLES } = await import('../changeLog')
    expect(SYNC_TABLES).not.toContain('syncState')
  })
})

describe('keyStore', () => {
  it('guarda, lee y borra el estado', async () => {
    const { getSyncState, saveSyncState, clearSyncState } = await import('../keyStore')
    expect(await getSyncState()).toBeUndefined()
    await saveSyncState(STATE)
    const got = await getSyncState()
    expect(got).toMatchObject({ id: 'self', spaceId: STATE.spaceId, cursor: 0, enabled: true })
    expect(Array.from(got!.seed)).toEqual(Array.from(STATE.seed))
    await saveSyncState({ ...STATE, cursor: 42, lastSyncAt: 5 })
    expect(await getSyncState()).toMatchObject({ cursor: 42, lastSyncAt: 5 })
    await clearSyncState()
    expect(await getSyncState()).toBeUndefined()
  })

  it('guardar el estado no genera cambios pendientes de subir', async () => {
    const { db } = await import('../../db/db')
    const { saveSyncState } = await import('../keyStore')
    await saveSyncState(STATE)
    expect(await db.syncChanges.count()).toBe(0)
  })
})

describe('backup', () => {
  it('el backup exportado no contiene syncState ni la seed', async () => {
    const { db } = await import('../../db/db')
    const { saveSyncState } = await import('../keyStore')
    const { exportBackup } = await import('../../utils/importBackup')
    await db.profiles.add({ name: 'Bebé', birthDate: new Date('2026-09-01'), createdAt: new Date() })
    await saveSyncState(STATE)
    const json = await exportBackup()
    expect(json).not.toContain('syncState')
    expect(json).not.toContain(STATE.spaceId)
    const parsed = JSON.parse(json)
    expect(parsed.schemaVersion).toBe(5)
    expect(Object.keys(parsed.data)).not.toContain('syncState')
  })

  it('importar un backup antiguo (v1) o v5 funciona y no toca syncState', async () => {
    const { db } = await import('../../db/db')
    const { saveSyncState, getSyncState } = await import('../keyStore')
    const { importBackup } = await import('../../utils/importBackup')
    await saveSyncState(STATE)
    const v1 = {
      schemaVersion: 1,
      exportedAt: '2025-01-01T00:00:00.000Z',
      data: {
        profiles: [{ id: 1, name: 'Bebé', birthDate: '2025-06-01T00:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z' }],
        diaryEntries: [{ id: 1, profileId: 1, date: '2025-01-02T00:00:00.000Z', week: -20, text: 'Hola', milestone: false }],
        growthRecords: [],
        appConfig: { id: 1, activeProfileId: 1 },
      },
    }
    expect(await importBackup(JSON.stringify(v1))).toBe(true)
    expect(await db.diaryEntries.count()).toBe(1)
    expect(await getSyncState()).toMatchObject({ spaceId: STATE.spaceId })

    const { exportBackup } = await import('../../utils/importBackup')
    expect(await importBackup(await exportBackup())).toBe(true)
    expect(await db.profiles.count()).toBe(1)
    expect(await getSyncState()).toMatchObject({ spaceId: STATE.spaceId })
  })
})
