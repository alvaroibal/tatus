import { describe, it, expect } from 'vitest'
import { deriveKeys, newSeed, phraseToSeed, recordId, seedToPhrase } from '../crypto'

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
