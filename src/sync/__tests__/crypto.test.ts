import { describe, it, expect } from 'vitest'
import { deriveKeys, newSeed, openRecord, phraseToSeed, recordId, sealRecord, seedToPhrase } from '../crypto'
import type { SyncRecord } from '../merge'

const FIXED = Uint8Array.from({ length: 16 }, (_, i) => i) // 0x00..0x0f

describe('frase de recuperación', () => {
  it('seed → frase → seed devuelve los mismos bytes', () => {
    const seed = newSeed()
    const phrase = seedToPhrase(seed)
    expect(phrase.split(' ')).toHaveLength(12)
    expect(phraseToSeed(phrase)).toEqual(seed)
  })

  it('ignora mayúsculas, espacios de más y acentos', () => {
    const phrase = seedToPhrase(FIXED)
    const sinAcentos = phrase.normalize('NFD').replace(/[̀-ͯ]/g, '')
    expect(sinAcentos).not.toBe(phrase) // la frase fija tiene alguna palabra con acento
    expect(phraseToSeed(sinAcentos)).toEqual(FIXED)
    expect(phraseToSeed(`  ${phrase.toUpperCase().split(' ').join('  ')}\n`)).toEqual(FIXED)
    // Acento puesto donde no va: también se reconoce.
    const words = phrase.split(' ')
    const plain = words.findIndex(w => /^[a-z]+$/.test(w) && /[aeiou]/.test(w))
    words[plain] = words[plain].replace(/[aeiou]/, v => ({ a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú' })[v]!)
    expect(phraseToSeed(words.join(' '))).toEqual(FIXED)
  })

  it('rechaza una palabra que no está en la lista', () => {
    const words = seedToPhrase(FIXED).split(' ')
    words[3] = 'tatus'
    expect(() => phraseToSeed(words.join(' '))).toThrow('Frase no válida')
  })

  it('rechaza un checksum incorrecto', () => {
    const words = seedToPhrase(FIXED).split(' ')
    // Cambiar la última palabra por otra válida rompe el checksum (4 bits) salvo 1/16;
    // se busca una que lo rompa con seguridad.
    const bad = ['ábaco', 'abdomen', 'abeja'].map(w => [...words.slice(0, 11), w].join(' '))
      .find(p => { try { phraseToSeed(p); return false } catch { return true } })
    expect(bad).toBeDefined()
    expect(() => phraseToSeed(bad!)).toThrow('Frase no válida')
  })

  it('rechaza una frase con menos de 12 palabras', () => {
    expect(() => phraseToSeed(seedToPhrase(FIXED).split(' ').slice(0, 11).join(' '))).toThrow('Frase no válida')
  })
})

describe('llaves', () => {
  it('vector fijo: la misma seed da siempre el mismo spaceId y rid', async () => {
    const keys = await deriveKeys(FIXED)
    // Calculados la primera vez (y comprobados con node:crypto hkdfSync/createHmac).
    // Si cambian, las familias existentes dejarían de encontrar sus datos.
    expect(keys.spaceId).toBe('0c903d6246207aa27c5d3faad5ced482')
    expect(await recordId(keys.ridKey, 'diaryEntries', 'u1')).toBe('E7VgaHjuRgYzoOHq_svoG1I41DVHtM5OvuaoqXS7IJI')
    expect(keys.authSecret).toHaveLength(32)
  })

  it('las llaves no se pueden extraer', async () => {
    const keys = await deriveKeys(FIXED)
    expect(keys.encKey.extractable).toBe(false)
    expect(keys.ridKey.extractable).toBe(false)
    await expect(crypto.subtle.exportKey('raw', keys.encKey)).rejects.toThrow()
    await expect(crypto.subtle.exportKey('raw', keys.ridKey)).rejects.toThrow()
  })

  it('rid distinto para otra tabla u otro uid', async () => {
    const { ridKey } = await deriveKeys(FIXED)
    const a = await recordId(ridKey, 'diaryEntries', 'u1')
    expect(await recordId(ridKey, 'diaryEntries', 'u2')).not.toBe(a)
    expect(await recordId(ridKey, 'careLogs', 'u1')).not.toBe(a)
  })
})

describe('registros cifrados', () => {
  const rec: SyncRecord = {
    tbl: 'diaryEntries', uid: 'u1', updatedAt: 1730000000000, updatedBy: 'A', deleted: false,
    data: { text: 'Hoy se ha reído por primera vez', week: 12, date: { $d: '2026-11-08T10:00:00.000Z' } },
  }

  /** Cambia un byte del payload ya en base64. */
  function flip(payload: string, index: number): string {
    const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0))
    bytes[index] ^= 0x01
    return btoa(String.fromCharCode(...bytes))
  }

  it('sella y abre ida y vuelta', async () => {
    const keys = await deriveKeys(FIXED)
    const rid = await recordId(keys.ridKey, rec.tbl, rec.uid)
    const payload = await sealRecord(keys, rid, rec)
    expect(payload).not.toContain('reído')
    expect(await openRecord(keys, rid, payload)).toEqual(rec)
  })

  it('dos sellados del mismo registro dan payloads distintos (IV aleatorio)', async () => {
    const keys = await deriveKeys(FIXED)
    const rid = await recordId(keys.ridKey, rec.tbl, rec.uid)
    expect(await sealRecord(keys, rid, rec)).not.toBe(await sealRecord(keys, rid, rec))
  })

  it('falla si se toca el IV, el cifrado o el hueco (AAD)', async () => {
    const keys = await deriveKeys(FIXED)
    const rid = await recordId(keys.ridKey, rec.tbl, rec.uid)
    const payload = await sealRecord(keys, rid, rec)
    await expect(openRecord(keys, rid, flip(payload, 0))).rejects.toThrow('No se pudo abrir el registro')
    await expect(openRecord(keys, rid, flip(payload, 20))).rejects.toThrow('No se pudo abrir el registro')
    const otherRid = await recordId(keys.ridKey, rec.tbl, 'u2')
    await expect(openRecord(keys, otherRid, payload)).rejects.toThrow('No se pudo abrir el registro')
  })

  it('falla con la llave de otra familia', async () => {
    const keys = await deriveKeys(FIXED)
    const rid = await recordId(keys.ridKey, rec.tbl, rec.uid)
    const payload = await sealRecord(keys, rid, rec)
    const other = await deriveKeys(newSeed())
    await expect(openRecord({ ...other, spaceId: keys.spaceId }, rid, payload)).rejects.toThrow('No se pudo abrir el registro')
  })

  it('rechaza un registro bien cifrado que no cumple SyncRecord', async () => {
    const keys = await deriveKeys(FIXED)
    const bad = { ...rec, tbl: 'syncState' } as unknown as SyncRecord
    const payload = await sealRecord(keys, 'r', bad)
    await expect(openRecord(keys, 'r', payload)).rejects.toThrow('No se pudo abrir el registro')
  })

  it('el error no lleva datos del registro', async () => {
    const keys = await deriveKeys(FIXED)
    const err = await openRecord(keys, 'r', 'no-es-base64!').catch((e: Error) => e)
    expect(err).toBeInstanceOf(Error)
    expect((err as Error).message).toBe('No se pudo abrir el registro')
    expect((err as Error).cause).toBeUndefined()
  })
})
