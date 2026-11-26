import { describe, it, expect, vi, beforeEach } from 'vitest'
import Dexie from 'dexie'
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb'
import { validateBirth, type BirthInput } from '../birth'

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
})

const jan = new Date(2026, 10, 23, 16, 1)
const input = (over: Partial<BirthInput['record']> = {}, name = 'Jan'): BirthInput => ({
  name,
  sex: 'boy',
  record: { at: jan, weightG: 3420, lengthCm: 50, headCm: 34.5, ...over },
  tests: { 'vit-k': { done: true }, talon: { done: true, note: 'Normal' } },
  vaccines: {},
})

describe('validateBirth', () => {
  const now = new Date(2026, 10, 26)
  it('acepta datos normales', () => {
    expect(validateBirth(input(), now).ok).toBe(true)
  })
  it('rechaza peso en kilos por error', () => {
    expect(validateBirth(input({ weightG: 3.4 }), now).error).toMatch(/gramos/)
  })
  it('rechaza fecha futura y nombre vacío', () => {
    expect(validateBirth(input({ at: new Date(2026, 11, 1) }), now).ok).toBe(false)
    expect(validateBirth(input({}, '  '), now).ok).toBe(false)
  })
  it('Apgar entre 0 y 10', () => {
    expect(validateBirth(input({ apgar1: 11 }), now).ok).toBe(false)
  })
})

describe('saveBirth', () => {
  beforeEach(() => {
    vi.resetModules()
    Dexie.dependencies.indexedDB = new IDBFactory()
    Dexie.dependencies.IDBKeyRange = IDBKeyRange
  })

  it('pasa el perfil de embarazo a nacido con todo lo asociado', async () => {
    const { db } = await import('../../db/db')
    const { saveBirth } = await import('../birth')
    const id = await db.profiles.add({ name: 'Jan', birthDate: new Date(2026, 11, 2), createdAt: new Date(), phase: 'expecting' })
    const profile = (await db.profiles.get(id))!

    await saveBirth(profile, { ...input(), bloodType: '0+', vaccines: { '0-Nirsevimab (anticuerpo frente a VRS)': true } })

    const p = (await db.profiles.get(id))!
    expect(p.phase).toBeUndefined()
    expect(p.birthDate).toEqual(jan)
    expect(p.birth?.weightG).toBe(3420)
    expect(p.sex).toBe('boy')
    expect(p.medical?.bloodType).toBe('0+')

    const g = await db.growthRecords.get([id, 0])
    expect(g).toMatchObject({ weightKg: 3.42, heightCm: 50, headCm: 34.5 })

    const talon = await db.checks.get(`${id}|recien-nacido|talon`)
    expect(talon).toMatchObject({ done: true, note: 'Normal' })
    const vrs = await db.checks.get(`${id}|vacunas|0-Nirsevimab (anticuerpo frente a VRS)`)
    expect(vrs?.done).toBe(true)

    const diary = await db.diaryEntries.toArray()
    expect(diary).toHaveLength(1)
    expect(diary[0].text).toContain('¡Ha nacido Jan!')

    // Editar después no duplica la entrada del diario
    await saveBirth(p, input({ weightG: 3450 }))
    expect(await db.diaryEntries.count()).toBe(1)
    expect((await db.growthRecords.get([id, 0]))?.weightKg).toBe(3.45)
  })

  it('las tablas de medicación se sincronizan', async () => {
    const { SYNC_TABLES } = await import('../../sync/changeLog')
    expect(SYNC_TABLES).toEqual(expect.arrayContaining(['medPlans', 'medDoses']))
  })
})
