import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Dexie from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { MemoryServer, MemoryTransport } from '../memoryTransport'
import { TransportError } from '../transport'

// Mismo patrón que engine.test.ts: cada "dispositivo" es una copia nueva de los
// módulos con su propio IndexedDB y deviceId. El servidor (MemoryServer) se
// comparte; cada dispositivo es un usuario anónimo distinto (MemoryTransport).

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
})

const stops: (() => void)[] = []
let server: MemoryServer

async function device(id: string) {
  vi.resetModules()
  Dexie.dependencies.indexedDB = new IDBFactory()
  Dexie.dependencies.IDBKeyRange = IDBKeyRange
  localStorage.setItem('tatus-device-id', id)
  const { db } = await import('../../db/db')
  const runner = await import('../runner')
  const { getSyncState } = await import('../keyStore')
  ;(await import('../clock')).getDeviceId()
  const transport = new MemoryTransport(server)
  runner.setTransport(transport)
  const d = { db, transport, getSyncState, ...runner }
  stops.push(runner.stopSync)
  return d
}

type Device = Awaited<ReturnType<typeof device>>

const seedOf = async (d: Device) => (await d.getSyncState())!.seed
const PHOTO = 'data:image/jpeg;base64,' + 'Zm90b2RlbGJlYmU'.repeat(20000) // ~300 KB, como una foto real
const SECRET_TEXT = 'texto secreto del diario'

async function seedData(d: Device) {
  const pid = (await d.db.profiles.add({ name: 'Bebé', birthDate: new Date('2026-09-01'), createdAt: new Date() }))!
  const entry = (await d.db.diaryEntries.add({ profileId: pid, date: new Date('2026-10-01'), week: 4, text: SECRET_TEXT, milestone: true }))!
  await d.db.entryPhotos.add({ diaryEntryId: entry, dataUrl: PHOTO })
  return { pid, entry }
}

/** Contenido comparable entre dispositivos (sin ids locales). */
async function snapshot(d: Device) {
  const strip = (rows: object[]) => rows.map(r => {
    const copy: Record<string, unknown> = { ...r }
    delete copy.id; delete copy.profileId; delete copy.diaryEntryId; delete copy.key
    return copy
  }).sort((a, b) => String(a.uid).localeCompare(String(b.uid)))
  return {
    profiles: strip(await d.db.profiles.toArray()),
    diaryEntries: strip(await d.db.diaryEntries.toArray()),
    entryPhotos: strip(await d.db.entryPhotos.toArray()),
    careLogs: strip(await d.db.careLogs.toArray()),
  }
}

beforeEach(() => {
  localStorage.clear()
  server = new MemoryServer()
})

afterEach(() => {
  for (const stop of stops.splice(0)) stop()
})

describe('runner con dos dispositivos y un servidor en memoria', () => {
  it('3.3.1 A activa y crea perfil + entrada + foto; B se une con la misma seed y recibe los tres', async () => {
    const a = await device('A')
    expect((await a.enableSync()).status).toBe('ok')
    await seedData(a)
    const up = await a.syncNow()
    expect(up).toMatchObject({ status: 'ok', pushed: 3, tooLarge: 0 })
    expect(await a.db.syncChanges.count()).toBe(0)

    // La foto va a Storage; en la fila solo queda blob_path.
    const spaceId = (await a.getSyncState())!.spaceId
    const photoRow = [...server.records.values()].find(r => r.blob_path !== null)!
    expect(photoRow).toMatchObject({ payload: null, blob_path: `${spaceId}/${photoRow.rid}` })
    expect(server.blobs.has(photoRow.blob_path!)).toBe(true)

    const b = await device('B')
    const res = await b.joinSync(await seedOf(a))
    expect(res).toMatchObject({ status: 'ok', applied: 3, discarded: 0, deferred: 0 })
    const entry = (await b.db.diaryEntries.toArray())[0]
    expect(await b.db.profiles.count()).toBe(1)
    expect(entry.text).toBe(SECRET_TEXT)
    const photo = (await b.db.entryPhotos.toArray())[0]
    expect(photo.dataUrl).toBe(PHOTO)
    expect(photo.diaryEntryId).toBe(entry.id)
    expect(await b.db.syncChanges.count()).toBe(0) // sin eco
    expect((await b.getSyncState())!.cursor).toBeGreaterThan(0)
  })

  it('3.3.2 conflicto: A y B editan la misma entrada; tras dos ciclos en cada uno, las bases son iguales', async () => {
    const a = await device('A')
    await a.enableSync()
    const { entry } = await seedData(a)
    await a.syncNow()
    const b = await device('B')
    await b.joinSync(await seedOf(a))
    const bEntry = (await b.db.diaryEntries.toArray())[0]

    await a.db.diaryEntries.update(entry, { text: 'de A' })
    await new Promise(r => setTimeout(r, 2))
    await b.db.diaryEntries.update(bEntry.id!, { text: 'de B' }) // la más nueva

    for (let i = 0; i < 2; i++) {
      await a.syncNow()
      await b.syncNow()
    }
    expect((await a.db.diaryEntries.get(entry))!.text).toBe('de B')
    expect(await snapshot(a)).toEqual(await snapshot(b))
  })

  it('3.3.3 borrado: A borra una entrada con fotos y B borra la entrada y sus fotos', async () => {
    const a = await device('A')
    await a.enableSync()
    const { entry } = await seedData(a)
    await a.db.entryPhotos.add({ diaryEntryId: entry, dataUrl: 'data:image/jpeg;base64,b3RyYQ' })
    await a.syncNow()
    const b = await device('B')
    await b.joinSync(await seedOf(a))
    expect(await b.db.entryPhotos.count()).toBe(2)

    await a.db.transaction('rw', a.db.diaryEntries, a.db.entryPhotos, async () => {
      await a.db.entryPhotos.where('diaryEntryId').equals(entry).delete()
      await a.db.diaryEntries.delete(entry)
    })
    expect(await a.syncNow()).toMatchObject({ status: 'ok', pushed: 3 })
    await b.syncNow()
    expect(await b.db.diaryEntries.count()).toBe(0)
    expect(await b.db.entryPhotos.count()).toBe(0)
    expect(await b.db.profiles.count()).toBe(1)
  })

  it('3.3.4 offline: 100 cambios con el transporte fallando y luego disponible → 100 registros, sin duplicados', async () => {
    const a = await device('A')
    await a.enableSync()
    const pid = (await a.db.profiles.add({ name: 'Bebé', birthDate: new Date(), createdAt: new Date() }))!
    await a.syncNow()
    const spaceId = (await a.getSyncState())!.spaceId
    const before = server.countRecords(spaceId)

    const push = vi.spyOn(a.transport, 'push').mockRejectedValue(new TransportError('network'))
    const ids: number[] = []
    for (let i = 0; i < 70; i++) ids.push((await a.db.careLogs.add({ profileId: pid, type: 'diaper', start: new Date(), diaper: 'wet' }))!)
    for (const id of ids.slice(0, 30)) await a.db.careLogs.update(id, { note: 'editado sin red' }) // 100 cambios
    const offline = await a.syncNow()
    expect(offline.status).toBe('error')
    expect((await a.getSyncState())!.lastError).toBe('No hay conexión con el servidor. Se volverá a intentar.')
    expect(await a.db.syncChanges.count()).toBe(70)
    expect(server.countRecords(spaceId)).toBe(before)

    push.mockRestore()
    const online = await a.syncNow()
    expect(online).toMatchObject({ status: 'ok', pushed: 70 })
    expect(server.countRecords(spaceId) - before).toBe(70) // un registro por fila, sin duplicados
    const rids = [...server.records.values()].map(r => r.rid)
    expect(new Set(rids).size).toBe(rids.length)
    expect(await a.db.syncChanges.count()).toBe(0)
    expect((await a.getSyncState())!.lastError).toBeUndefined()

    const b = await device('B')
    await b.joinSync(await seedOf(a))
    expect((await b.db.careLogs.toArray()).filter(l => l.note === 'editado sin red')).toHaveLength(30)
  })

  it('3.3.5 recuperación: un dispositivo vacío con la misma seed recupera todo (conteos iguales por tabla)', async () => {
    const a = await device('A')
    const { pid, entry } = await seedData(a)
    await a.db.futureLetters.add({ profileId: pid, date: new Date(), week: 5, title: 'Carta', body: 'hola', locked: true })
    await a.db.growthRecords.put({ profileId: pid, week: 10, date: new Date(), weightKg: 4 })
    await a.db.careLogs.add({ profileId: pid, type: 'bottle', start: new Date(), amountMl: 90, milk: 'formula' })
    await a.db.appointments.add({ profileId: pid, date: new Date(), title: 'Pediatra', kind: 'pediatra', done: false })
    await a.db.checks.put({ key: `${pid}|vacunas|hexa`, profileId: pid, done: true })
    await a.db.entryPhotos.add({ diaryEntryId: entry, dataUrl: 'data:image/jpeg;base64,c2VndW5kYQ' })
    await a.enableSync() // queueEverything sube lo que ya existía

    const c = await device('C')
    const res = await c.joinSync(await seedOf(a))
    expect(res).toMatchObject({ status: 'ok', discarded: 0, deferred: 0 })
    for (const t of ['profiles', 'diaryEntries', 'futureLetters', 'growthRecords', 'careLogs', 'appointments', 'checks', 'entryPhotos'] as const) {
      expect([t, await c.db.table(t).count()]).toEqual([t, await a.db.table(t).count()])
    }
    const cPid = (await c.db.profiles.toArray())[0].id
    expect(await c.db.checks.get(`${cPid}|vacunas|hexa`)).toMatchObject({ done: true })
  })

  it('3.2.3 los hijos que llegan antes que su padre se aplazan entre páginas y el cursor no los salta', async () => {
    const a = await device('A')
    await a.enableSync()
    const { pid } = await seedData(a)
    await a.db.careLogs.add({ profileId: pid, type: 'med', start: new Date(), medName: 'Apiretal' })
    await a.syncNow()
    await a.db.profiles.update(pid, { name: 'Bebé 2' }) // el perfil queda con el seq más alto
    await a.syncNow()
    const spaceId = (await a.getSyncState())!.spaceId
    const profileRow = [...server.records.entries()].sort((x, y) => y[1].seq - x[1].seq)[0]

    // Páginas de una fila: los hijos llegan antes que el perfil.
    const b = await device('B')
    const pull = b.transport.pull.bind(b.transport)
    vi.spyOn(b.transport, 'pull').mockImplementation((space, after) => pull(space, after, 1))
    // Primero sin el perfil en el servidor: los hijos se quedan aplazados.
    server.records.delete(profileRow[0])
    const first = await b.joinSync(await seedOf(a))
    expect(first).toMatchObject({ status: 'ok', applied: 0, deferred: 3 })
    const minSeq = Math.min(...[...server.records.values()].filter(r => r.space_id === spaceId).map(r => r.seq))
    expect((await b.getSyncState())!.cursor).toBe(minSeq - 1)

    // Llega el perfil (seq nuevo): el siguiente ciclo vuelve a bajar los aplazados y aplica todo.
    server.records.set(profileRow[0], { ...profileRow[1], seq: server.nextSeq() })
    const second = await b.syncNow()
    expect(second).toMatchObject({ status: 'ok', deferred: 0 })
    expect(await b.db.careLogs.count()).toBe(1)
    expect(await b.db.entryPhotos.count()).toBe(1)
    expect((await b.db.profiles.toArray())[0].name).toBe('Bebé 2')
    expect((await b.getSyncState())!.cursor).toBe(Math.max(...[...server.records.values()].map(r => r.seq)))
  })

  it('un registro que supera 1 MB cifrado no se sube, queda pendiente y no rompe el ciclo', async () => {
    const a = await device('A')
    await a.enableSync()
    const { entry } = await seedData(a)
    await a.db.entryPhotos.add({ diaryEntryId: entry, dataUrl: 'data:image/jpeg;base64,' + 'A'.repeat(800_000) })
    const res = await a.syncNow()
    expect(res).toMatchObject({ status: 'ok', pushed: 3, tooLarge: 1 })
    expect(await a.db.syncChanges.count()).toBe(1)
    expect((await a.getSyncState())!.lastError).toBe('Una foto es demasiado grande para sincronizarse.')
  })
})

describe('seguridad', () => {
  it('el servidor no guarda ningún texto en claro', async () => {
    const a = await device('A')
    await a.enableSync()
    await seedData(a)
    await a.db.careLogs.add({ profileId: 1, type: 'med', start: new Date(), medName: 'Apiretal' })
    await a.syncNow()
    const dump = JSON.stringify({ records: [...server.records.values()], blobs: [...server.blobs.values()] })
    for (const plain of [SECRET_TEXT, 'Bebé', 'Apiretal', 'diaryEntries', 'entryPhotos', 'Zm90b2RlbGJlYmU']) {
      expect(dump.split(plain).length - 1).toBe(0)
    }
  })

  it('un payload manipulado o un blob_path de otra familia se descartan sin romper el ciclo', async () => {
    const a = await device('A')
    await a.enableSync()
    await seedData(a)
    await a.db.careLogs.add({ profileId: 1, type: 'diaper', start: new Date() })
    await a.syncNow()

    const rows = [...server.records.values()]
    const tampered = rows.find(r => r.payload !== null && r.payload.length > 100)!
    tampered.payload = (tampered.payload![50] === 'A' ? 'B' : 'A') + tampered.payload!.slice(1)
    const photo = rows.find(r => r.blob_path !== null)!
    const other = 'f'.repeat(32)
    photo.blob_path = `${other}/${photo.rid}`
    server.blobs.set(photo.blob_path, server.blobs.get(`${tampered.space_id}/${photo.rid}`)!)
    server.addMember(other, 'user-2') // aunque B pudiera leerlo, no es el hueco de este registro

    const b = await device('B')
    const getBlob = vi.spyOn(b.transport, 'getBlob')
    const res = await b.joinSync(await seedOf(a))
    expect(res).toMatchObject({ status: 'ok', pulled: 4, discarded: 2 })
    expect(getBlob).not.toHaveBeenCalled()
    expect(await b.db.entryPhotos.count()).toBe(0)
    expect((await b.getSyncState())!.lastError).toBeUndefined()
  })

  it('una seed equivocada no se une a la familia', async () => {
    const a = await device('A')
    await a.enableSync()
    const b = await device('B')
    const wrong = new Uint8Array(await seedOf(a))
    wrong[0] ^= 1
    // Otra seed = otra familia que no existe: 42501.
    await expect(b.joinSync(wrong)).rejects.toMatchObject({ name: 'TransportError', code: 'denied' })
    expect(await b.getSyncState()).toBeUndefined()
  })
})

describe('exclusión y estado', () => {
  it('dos syncNow simultáneos → una sola ejecución de push', async () => {
    const a = await device('A')
    await a.enableSync()
    await seedData(a)
    const push = vi.spyOn(a.transport, 'push')
    const [r1, r2] = await Promise.all([a.syncNow(), a.syncNow()])
    expect(push).toHaveBeenCalledTimes(1)
    expect(r1).toBe(r2)
    expect(a.isSyncing()).toBe(false)
  })

  it('sin activar no hace nada; sin transporte la sync no está disponible', async () => {
    const a = await device('A')
    expect((await a.syncNow()).status).toBe('off')
    a.setTransport(null)
    expect(a.isSyncAvailable()).toBe(false) // en los tests no hay VITE_SUPABASE_*
    await expect(a.enableSync()).rejects.toThrow('Sincronización no disponible')
  })

  it('3.2.4 disparadores: 5 s después de la última escritura local y al volver a primer plano', async () => {
    const a = await device('A')
    await a.enableSync()
    const pid = (await a.db.profiles.add({ name: 'Bebé', birthDate: new Date(), createdAt: new Date() }))!
    await vi.waitFor(async () => expect(await a.db.syncChanges.count()).toBe(0), { timeout: 12000, interval: 200 })

    const push = vi.spyOn(a.transport, 'push')
    await a.db.careLogs.add({ profileId: pid, type: 'diaper', start: new Date() })
    await new Promise(r => setTimeout(r, 2000))
    await a.db.careLogs.add({ profileId: pid, type: 'diaper', start: new Date() }) // reinicia la espera
    await new Promise(r => setTimeout(r, 4000))
    expect(push).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(push).toHaveBeenCalledTimes(1), { timeout: 5000, interval: 100 })
    expect(push.mock.calls[0][1]).toHaveLength(2)

    const pull = vi.spyOn(a.transport, 'pull')
    document.dispatchEvent(new Event('visibilitychange')) // jsdom: visibilityState = 'visible'
    await vi.waitFor(() => expect(pull).toHaveBeenCalled())
  }, 30000)

  it('subscribeSyncing avisa al empezar y al terminar', async () => {
    const a = await device('A')
    await a.enableSync()
    const seen: boolean[] = []
    const off = a.subscribeSyncing(() => seen.push(a.isSyncing()))
    await a.syncNow()
    off()
    expect(seen).toEqual([true, false])
  })
})
