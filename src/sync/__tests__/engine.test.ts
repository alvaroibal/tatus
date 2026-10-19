import { describe, it, expect, vi, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'

// Node 26 trae un localStorage global vacío que tapa el de jsdom.
const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
})

// Cada "dispositivo" es una instancia nueva de los módulos con su propio
// IndexedDB en memoria y su propio deviceId.
// vi.resetModules no recarga dexie (está en node_modules), así que el
// IndexedDB se cambia en Dexie.dependencies; cada instancia lo captura al crearse.
function freshIndexedDB() {
  Dexie.dependencies.indexedDB = new IDBFactory()
  Dexie.dependencies.IDBKeyRange = IDBKeyRange
}

async function device(id: string) {
  vi.resetModules()
  freshIndexedDB()
  localStorage.setItem('tatus-device-id', id)
  const { db } = await import('../../db/db')
  const engine = await import('../engine')
  ;(await import('../clock')).getDeviceId() // fijarlo antes de crear otro dispositivo
  return { db, ...engine }
}

type Device = Awaited<ReturnType<typeof device>>

/** Sube lo pendiente de `from` y lo aplica en `to`, como haría el servidor. */
async function sync(from: Device, to: Device) {
  const { records, changes } = await from.collectOutgoing()
  const wire = JSON.parse(JSON.stringify(records))
  const result = await to.applyRemote(wire)
  await from.ackOutgoing(changes)
  return result
}

async function seedProfile(d: Device) {
  return d.db.profiles.add({ name: 'Bebé', birthDate: new Date('2026-09-01'), createdAt: new Date() })
}

beforeEach(() => localStorage.clear())

describe('registro de cambios', () => {
  it('asigna uid y marca, y registra el alta', async () => {
    const d = await device('A')
    const pid = await seedProfile(d)
    const id = await d.db.careLogs.add({ profileId: pid!, type: 'diaper', start: new Date(), diaper: 'wet' })
    const row = await d.db.careLogs.get(id)
    expect(row?.uid).toMatch(/^[0-9a-f-]{36}$/)
    expect(row?.updatedBy).toBe('A')
    const changes = await d.db.syncChanges.toArray()
    expect(changes.map(c => [c.tbl, c.op])).toEqual(expect.arrayContaining([['profiles', 'put'], ['careLogs', 'put']]))
  })

  it('update y modify conservan el uid y suben la marca', async () => {
    const d = await device('A')
    const pid = await seedProfile(d)
    const id = await d.db.careLogs.add({ profileId: pid!, type: 'sleep', start: new Date() })
    const before = (await d.db.careLogs.get(id))!
    await d.db.careLogs.update(id, { end: new Date() })
    await d.db.careLogs.where('profileId').equals(pid!).modify({ note: 'siesta' })
    const after = (await d.db.careLogs.get(id))!
    expect(after.uid).toBe(before.uid)
    expect(after.updatedAt).toBeGreaterThan(before.updatedAt!)
    expect(await d.db.syncChanges.get(['careLogs', before.uid!])).toMatchObject({ op: 'put', at: after.updatedAt })
  })

  it('put sin uid sobre una fila existente conserva su uid', async () => {
    const d = await device('A')
    const pid = await seedProfile(d)
    const id = await d.db.appointments.add({ profileId: pid!, date: new Date(), title: 'Pediatra', kind: 'pediatra', done: false })
    const uid = (await d.db.appointments.get(id))!.uid
    await d.db.appointments.put({ id, profileId: pid!, date: new Date(), title: 'Pediatra', kind: 'pediatra', done: true })
    expect((await d.db.appointments.get(id))!.uid).toBe(uid)
  })

  it('los borrados (también por rango y clear) dejan tombstone', async () => {
    const d = await device('A')
    const pid = await seedProfile(d)
    const entry = await d.db.diaryEntries.add({ profileId: pid!, date: new Date(), week: 3, text: 'hola', milestone: false })
    await d.db.entryPhotos.bulkAdd([{ diaryEntryId: entry!, dataUrl: 'a' }, { diaryEntryId: entry!, dataUrl: 'b' }])
    const photoUids = (await d.db.entryPhotos.toArray()).map(p => p.uid)
    await d.db.entryPhotos.where('diaryEntryId').equals(entry!).delete()
    const entryUid = (await d.db.diaryEntries.get(entry))!.uid
    await d.db.diaryEntries.clear()
    const tomb = (await d.db.syncChanges.where('at').above(0).toArray()).filter(c => c.op === 'delete').map(c => c.uid)
    expect(tomb.sort()).toEqual([...photoUids, entryUid].sort())
  })

  it('crecimiento y checks usan uid natural (mismo registro en ambos móviles)', async () => {
    const d = await device('A')
    const pid = await seedProfile(d)
    const puid = (await d.db.profiles.get(pid))!.uid
    await d.db.growthRecords.put({ profileId: pid!, week: 10, date: new Date(), weightKg: 4 })
    await d.db.checks.put({ key: `${pid}|vacunas|hexa`, profileId: pid!, done: true })
    expect((await d.db.growthRecords.get([pid!, 10]))!.uid).toBe(`${puid}:10`)
    expect((await d.db.checks.get(`${pid}|vacunas|hexa`))!.uid).toBe(`${puid}|vacunas|hexa`)
  })
})

describe('dos dispositivos', () => {
  it('replica perfil, diario, fotos y tomas con ids locales distintos', async () => {
    const a = await device('A')
    // B ya tiene algo propio, así sus ids locales no coinciden con los de A.
    const b = await device('B')
    await b.db.profiles.add({ name: 'Otro', birthDate: new Date(), createdAt: new Date() })
    await b.db.syncChanges.clear()

    const pid = await seedProfile(a)
    const entry = await a.db.diaryEntries.add({ profileId: pid!, date: new Date('2026-10-01'), week: 4, text: 'primer baño', milestone: true })
    await a.db.entryPhotos.add({ diaryEntryId: entry!, dataUrl: 'data:image/jpeg;base64,xx' })
    await a.db.careLogs.add({ profileId: pid!, type: 'bottle', start: new Date('2026-10-19T03:00:00Z'), amountMl: 90, milk: 'formula' })
    await a.db.checks.put({ key: `${pid}|vacunas|hexa`, profileId: pid!, done: true })

    const result = await sync(a, b)
    expect(result.deferred).toEqual([])

    const bProfile = (await b.db.profiles.where('name').equals('Bebé').first())!
    expect(bProfile.id).not.toBe(pid)
    const bEntry = (await b.db.diaryEntries.where('profileId').equals(bProfile.id!).first())!
    expect(bEntry.text).toBe('primer baño')
    expect(bEntry.date).toBeInstanceOf(Date)
    expect(await b.db.entryPhotos.where('diaryEntryId').equals(bEntry.id!).count()).toBe(1)
    expect(await b.db.careLogs.where('profileId').equals(bProfile.id!).first()).toMatchObject({ amountMl: 90, updatedBy: 'A' })
    expect(await b.db.checks.get(`${bProfile.id}|vacunas|hexa`)).toMatchObject({ done: true })

    // Lo recibido no se vuelve a subir (no hay eco) y A queda sin pendientes.
    expect(await b.db.syncChanges.count()).toBe(0)
    expect(await a.db.syncChanges.count()).toBe(0)
  })

  it('ida y vuelta: B edita, A recibe; el último en escribir gana en ambos', async () => {
    const a = await device('A')
    const b = await device('B')
    const pid = await seedProfile(a)
    const apptId = await a.db.appointments.add({ profileId: pid!, date: new Date(), title: 'Eco', kind: 'eco', done: false })
    await sync(a, b)

    const bAppt = (await b.db.appointments.toArray())[0]
    // Conflicto: los dos editan la misma cita; B escribe después.
    await a.db.appointments.update(apptId, { notes: 'de A' })
    await new Promise(r => setTimeout(r, 2))
    await b.db.appointments.update(bAppt.id!, { notes: 'de B' })

    await sync(a, b) // llega la edición vieja de A: B la ignora
    await sync(b, a) // llega la de B: A la aplica
    expect((await a.db.appointments.get(apptId))!.notes).toBe('de B')
    expect((await b.db.appointments.get(bAppt.id!))!.notes).toBe('de B')
  })

  it('un borrado se propaga y una edición antigua no lo resucita', async () => {
    const a = await device('A')
    const b = await device('B')
    const pid = await seedProfile(a)
    const logId = await a.db.careLogs.add({ profileId: pid!, type: 'diaper', start: new Date(), diaper: 'dirty' })
    await sync(a, b)
    const bLog = (await b.db.careLogs.toArray())[0]

    await b.db.careLogs.update(bLog.id!, { note: 'antes' })
    await new Promise(r => setTimeout(r, 2))
    await a.db.careLogs.delete(logId)

    await sync(a, b)
    expect(await b.db.careLogs.count()).toBe(0)
    await sync(b, a) // B ya no tiene pendiente (lo superó el borrado)
    expect(await a.db.careLogs.count()).toBe(0)
  })

  it('aplaza los hijos cuyo padre aún no ha llegado', async () => {
    const a = await device('A')
    const b = await device('B')
    const pid = await seedProfile(a)
    await a.db.careLogs.add({ profileId: pid!, type: 'med', start: new Date(), medName: 'Apiretal' })
    const { records } = await a.collectOutgoing()
    const onlyChild = records.filter(r => r.tbl === 'careLogs')
    const res = await b.applyRemote(onlyChild)
    expect(res.deferred).toHaveLength(1)
    const res2 = await b.applyRemote(records)
    expect(res2.deferred).toEqual([])
    expect(await b.db.careLogs.count()).toBe(1)
  })

  it('ackOutgoing no borra un cambio hecho mientras se subía', async () => {
    const a = await device('A')
    const pid = await seedProfile(a)
    const id = await a.db.careLogs.add({ profileId: pid!, type: 'sleep', start: new Date() })
    const { changes } = await a.collectOutgoing()
    await a.db.careLogs.update(id, { end: new Date() })
    await a.ackOutgoing(changes)
    const left = await a.db.syncChanges.toArray()
    expect(left.map(c => c.tbl)).toEqual(['careLogs'])
  })

  it('queueEverything pone en cola todo lo existente', async () => {
    const a = await device('A')
    const pid = await seedProfile(a)
    await a.db.careLogs.add({ profileId: pid!, type: 'pump', start: new Date(), amountMl: 60 })
    await a.db.syncChanges.clear()
    expect(await a.queueEverything()).toBe(2)
  })
})

describe('migración v4 → v5', () => {
  it('asigna uids a los datos existentes', async () => {
    vi.resetModules()
    freshIndexedDB()
    const old = new Dexie('tatus-db')
    old.version(4).stores({
      profiles: '++id,name', diaryEntries: '++id,profileId,date,week,milestone', growthRecords: '[profileId+week],date',
      appConfig: 'id', futureLetters: '++id,profileId,date,week', entryPhotos: '++id,diaryEntryId',
      careLogs: '++id,profileId,start,type', appointments: '++id,profileId,date', checks: 'key,profileId',
    })
    const pid = await old.table('profiles').add({ name: 'Bebé', birthDate: new Date(), createdAt: new Date() })
    await old.table('careLogs').add({ profileId: pid, type: 'diaper', start: new Date() })
    await old.table('growthRecords').add({ profileId: pid, week: 2, date: new Date(), weightKg: 3.5 })
    old.close()

    localStorage.setItem('tatus-device-id', 'A')
    const { db } = await import('../../db/db')
    const profile = (await db.profiles.get(pid as number))!
    expect(profile.uid).toBeTruthy()
    expect((await db.careLogs.toArray())[0].uid).toBeTruthy()
    expect((await db.growthRecords.toArray())[0].uid).toBe(`${profile.uid}:2`)
  })
})
