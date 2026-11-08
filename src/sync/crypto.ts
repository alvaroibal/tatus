import { entropyToMnemonic, mnemonicToEntropy } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/spanish.js'

// Cripto de Tatuś Sync. Todo sale de una seed de 16 bytes que solo vive en los
// dispositivos de la familia; el servidor nunca la ve. Los errores son
// genéricos a propósito: nunca llevan la seed, la frase ni las llaves.

/** Seed aleatoria de 16 bytes (= 12 palabras). */
export function newSeed(): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(16))
}

// --- Frase de 12 palabras (BIP39, lista española) -------------------------

// Sin acentos ni mayúsculas: "Ábaco", "abaco" y "ábaco" son la misma palabra.
// En la lista española siguen siendo únicas tras quitar los acentos.
const fold = (w: string) => w.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const WORDS = new Map(wordlist.map(w => [fold(w), w]))

export function seedToPhrase(seed: Uint8Array): string {
  return entropyToMnemonic(seed, wordlist).normalize('NFC')
}

export function phraseToSeed(words: string): Uint8Array<ArrayBuffer> {
  const list = words.trim().split(/\s+/).map(w => WORDS.get(fold(w)))
  if (list.length !== 12 || list.some(w => w === undefined)) throw new Error('Frase no válida')
  try {
    return new Uint8Array(mnemonicToEntropy(list.join(' '), wordlist))
  } catch {
    throw new Error('Frase no válida')
  }
}
