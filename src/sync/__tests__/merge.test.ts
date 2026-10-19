import { describe, it, expect } from 'vitest'
import { decodeRecord, encodeRow, isNewer, planMerge, type LocalState, type SyncRecord } from '../merge'
import { nextStamp, observeStamp, resetClock } from '../clock'

const rec = (over: Partial<SyncRecord>): SyncRecord => ({
  tbl: 'careLogs', uid: 'u1', updatedAt: 100, updatedBy: 'A', deleted: false, data: {}, ...over,
})

const localOf = (entries: Record<string, LocalState>) =>
  (tbl: string, uid: string) => entries[`${tbl}:${uid}`]

describe('isNewer', () => {
  it('compara por marca de tiempo', () => {
    expect(isNewer({ updatedAt: 2, updatedBy: 'A' }, { updatedAt: 1, updatedBy: 'B' })).toBe(true)
    expect(isNewer({ updatedAt: 1, updatedBy: 'B' }, { updatedAt: 2, updatedBy: 'A' })).toBe(false)
  })

  it('desempata por dispositivo de forma determinista', () => {
    const a = { updatedAt: 5, updatedBy: 'A' }
    const b = { updatedAt: 5, updatedBy: 'B' }
    expect(isNewer(b, a)).toBe(true)
    expect(isNewer(a, b)).toBe(false)
    expect(isNewer(a, a)).toBe(false)
  })
})

describe('planMerge', () => {
  it('aplica registros nuevos que no existen en local', () => {
    expect(planMerge([rec({})], () => undefined)).toHaveLength(1)
  })

  it('ignora borrados de algo que no existe en local', () => {
    expect(planMerge([rec({ deleted: true })], () => undefined)).toEqual([])
  })

  it('el remoto más nuevo gana a la fila local', () => {
    const local = localOf({ 'careLogs:u1': { updatedAt: 50, updatedBy: 'B', deleted: false } })
    expect(planMerge([rec({ updatedAt: 100 })], local)).toHaveLength(1)
  })

  it('el remoto más viejo no pisa la fila local', () => {
    const local = localOf({ 'careLogs:u1': { updatedAt: 200, updatedBy: 'B', deleted: false } })
    expect(planMerge([rec({ updatedAt: 100 })], local)).toEqual([])
  })

  it('un borrado remoto posterior elimina la fila local', () => {
    const local = localOf({ 'careLogs:u1': { updatedAt: 50, updatedBy: 'B', deleted: false } })
    expect(planMerge([rec({ updatedAt: 100, deleted: true })], local)[0].deleted).toBe(true)
  })

  it('una edición remota vieja no resucita algo borrado aquí después', () => {
    const local = localOf({ 'careLogs:u1': { updatedAt: 300, updatedBy: 'B', deleted: true } })
    expect(planMerge([rec({ updatedAt: 100 })], local)).toEqual([])
  })

  it('una edición remota posterior al borrado local sí lo resucita', () => {
    const local = localOf({ 'careLogs:u1': { updatedAt: 100, updatedBy: 'B', deleted: true } })
    expect(planMerge([rec({ updatedAt: 300 })], local)).toHaveLength(1)
  })

  it('con varias versiones del mismo uid en el lote se queda con la última', () => {
    const plan = planMerge([
      rec({ updatedAt: 100, data: { note: 'vieja' } }),
      rec({ updatedAt: 300, data: { note: 'nueva' } }),
      rec({ updatedAt: 200, data: { note: 'media' } }),
    ], () => undefined)
    expect(plan).toHaveLength(1)
    expect(plan[0].data?.note).toBe('nueva')
  })

  it('ordena padres antes que hijos', () => {
    const plan = planMerge([
      rec({ tbl: 'entryPhotos', uid: 'f' }),
      rec({ tbl: 'diaryEntries', uid: 'd' }),
      rec({ tbl: 'profiles', uid: 'p' }),
    ], () => undefined)
    expect(plan.map(r => r.tbl)).toEqual(['profiles', 'diaryEntries', 'entryPhotos'])
  })

  it('converge: dos dispositivos con el mismo conflicto eligen el mismo ganador', () => {
    const fromA = rec({ updatedAt: 100, updatedBy: 'A', data: { note: 'A' } })
    const fromB = rec({ updatedAt: 100, updatedBy: 'B', data: { note: 'B' } })
    // A recibe lo de B y B recibe lo de A
    const onA = planMerge([fromB], localOf({ 'careLogs:u1': { ...fromA, deleted: false } }))
    const onB = planMerge([fromA], localOf({ 'careLogs:u1': { ...fromB, deleted: false } }))
    expect(onA.map(r => r.data?.note)).toEqual(['B'])
    expect(onB).toEqual([])
  })
})

describe('codec', () => {
  const encodeRefs = {
    profileUid: (id: number) => ({ 1: 'P1' } as Record<number, string>)[id],
    diaryUid: (id: number) => ({ 7: 'D7' } as Record<number, string>)[id],
  }
  // En el otro dispositivo los mismos uids tienen otros ids locales.
  const decodeRefs = {
    profileId: (uid: string) => ({ P1: 42 } as Record<string, number>)[uid],
    diaryId: (uid: string) => ({ D7: 99 } as Record<string, number>)[uid],
  }

  it('traduce ids locales a uids y conserva fechas', () => {
    const start = new Date('2026-10-19T08:30:00Z')
    const out = encodeRow('careLogs', {
      id: 5, uid: 'c1', updatedAt: 10, updatedBy: 'A', profileId: 1, type: 'bottle', start, amountMl: 90, end: undefined,
    }, encodeRefs)
    expect(out.data).toEqual({ profileUid: 'P1', type: 'bottle', start: { $d: start.toISOString() }, amountMl: 90 })
    expect(JSON.parse(JSON.stringify(out))).toEqual(out)

    const row = decodeRecord(JSON.parse(JSON.stringify(out)), decodeRefs)!
    expect(row).toMatchObject({ uid: 'c1', profileId: 42, type: 'bottle', amountMl: 90, updatedAt: 10, updatedBy: 'A' })
    expect(row.start).toBeInstanceOf(Date)
    expect((row.start as Date).getTime()).toBe(start.getTime())
    expect(row).not.toHaveProperty('id')
  })

  it('traduce la foto a su entrada del diario', () => {
    const out = encodeRow('entryPhotos', { id: 3, uid: 'f1', updatedAt: 1, updatedBy: 'A', diaryEntryId: 7, dataUrl: 'data:x' }, encodeRefs)
    expect(decodeRecord(out, decodeRefs)).toMatchObject({ diaryEntryId: 99, dataUrl: 'data:x' })
  })

  it('reconstruye la clave de checks con el id local del perfil', () => {
    const out = encodeRow('checks', { key: '1|vacunas|hexa-2m', profileId: 1, done: true, uid: 'P1|vacunas|hexa-2m', updatedAt: 1, updatedBy: 'A' }, encodeRefs)
    expect(decodeRecord(out, decodeRefs)).toMatchObject({ key: '42|vacunas|hexa-2m', profileId: 42, done: true })
  })

  it('crecimiento usa la clave natural perfil+semana', () => {
    const out = encodeRow('growthRecords', { profileId: 1, week: 10, weightKg: 4.2, uid: 'P1:10', updatedAt: 1, updatedBy: 'A', date: new Date() }, encodeRefs)
    expect(decodeRecord(out, decodeRefs)).toMatchObject({ profileId: 42, week: 10, weightKg: 4.2 })
    expect(decodeRecord({ ...out, uid: 'P1:11' }, decodeRefs)).toBeNull()
  })

  it('devuelve null si el padre aún no ha llegado', () => {
    const out = encodeRow('entryPhotos', { uid: 'f1', updatedAt: 1, updatedBy: 'A', diaryEntryId: 7, dataUrl: 'x' }, encodeRefs)
    expect(decodeRecord(out, { ...decodeRefs, diaryId: () => undefined })).toBeNull()
  })
})

describe('reloj', () => {
  it('nunca retrocede y supera las marcas remotas vistas', () => {
    resetClock()
    const a = nextStamp(1000)
    const b = nextStamp(900) // reloj del sistema atrasado
    expect(b).toBeGreaterThan(a)
    observeStamp(5000) // el otro móvil va adelantado
    expect(nextStamp(1000)).toBeGreaterThan(5000)
  })
})
