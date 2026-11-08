import { entropyToMnemonic, mnemonicToEntropy } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/spanish.js'
import { z } from 'zod'
import { SYNC_TABLES } from './changeLog'
import type { SyncRecord } from './merge'

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

// --- Llaves (HKDF-SHA256) -------------------------------------------------

const utf8 = new TextEncoder()
const SALT = utf8.encode('tatus-sync-v1')

export interface SyncKeys {
  spaceId: string          // 32 hex: identificador público de la familia
  authSecret: Uint8Array   // 32 bytes: prueba de pertenencia (el servidor guarda su sha256)
  encKey: CryptoKey        // AES-GCM-256, no extraíble
  ridKey: CryptoKey        // HMAC-SHA256, no extraíble
}

const hkdf = (info: string): HkdfParams => ({ name: 'HKDF', hash: 'SHA-256', salt: SALT, info: utf8.encode(info) })

const toHex = (b: Uint8Array) => Array.from(b, x => x.toString(16).padStart(2, '0')).join('')

export async function deriveKeys(seed: Uint8Array<ArrayBuffer>): Promise<SyncKeys> {
  const ikm = await crypto.subtle.importKey('raw', seed, 'HKDF', false, ['deriveBits', 'deriveKey'])
  const [space, auth, encKey, ridKey] = await Promise.all([
    crypto.subtle.deriveBits(hkdf('space'), ikm, 128),
    crypto.subtle.deriveBits(hkdf('auth'), ikm, 256),
    crypto.subtle.deriveKey(hkdf('enc'), ikm, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']),
    crypto.subtle.deriveKey(hkdf('rid'), ikm, { name: 'HMAC', hash: 'SHA-256', length: 256 }, false, ['sign']),
  ])
  return { spaceId: toHex(new Uint8Array(space)), authSecret: new Uint8Array(auth), encKey, ridKey }
}

// --- Base64 ----------------------------------------------------------------

function toBase64(b: Uint8Array): string {
  let s = ''
  for (const x of b) s += String.fromCharCode(x)
  return btoa(s)
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), c => c.charCodeAt(0))
}

const toBase64Url = (b: Uint8Array) => toBase64(b).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// --- QR ------------------------------------------------------------------------

const QR_PREFIX = 'tatus-sync:1:'

/** Mismo secreto que la frase, en formato para QR. */
export const encodeQr = (seed: Uint8Array) => QR_PREFIX + toBase64Url(seed)

export function decodeQr(text: string): Uint8Array<ArrayBuffer> | null {
  if (!text.startsWith(QR_PREFIX)) return null
  const b64url = text.slice(QR_PREFIX.length)
  if (!/^[A-Za-z0-9_-]{22}$/.test(b64url)) return null // 16 bytes
  const seed = fromBase64(b64url.replace(/-/g, '+').replace(/_/g, '/') + '==')
  return seed.length === 16 ? seed : null
}

/** Id opaco del registro: el servidor no sabe ni la tabla ni el uid. */
export async function recordId(ridKey: CryptoKey, tbl: string, uid: string): Promise<string> {
  const mac = await crypto.subtle.sign('HMAC', ridKey, utf8.encode(`${tbl}:${uid}`))
  return toBase64Url(new Uint8Array(mac))
}

// --- Registros cifrados ----------------------------------------------------

// Refleja SyncRecord (merge.ts). Lo que llega del servidor no es de fiar.
const SyncRecordSchema = z.object({
  tbl: z.enum(SYNC_TABLES),
  uid: z.string(),
  updatedAt: z.number(),
  updatedBy: z.string(),
  deleted: z.boolean(),
  data: z.record(z.string(), z.unknown()).optional(),
})

// El AAD ata el bloque a su familia y a su hueco: moverlo hace fallar el descifrado.
const aad = (spaceId: string, rid: string) => utf8.encode(`${spaceId}|${rid}`)

/** base64(iv[12] ‖ AES-GCM(JSON(rec))). */
export async function sealRecord(keys: SyncKeys, rid: string, rec: SyncRecord): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: aad(keys.spaceId, rid) },
    keys.encKey,
    utf8.encode(JSON.stringify(rec)),
  )
  const out = new Uint8Array(iv.length + ct.byteLength)
  out.set(iv)
  out.set(new Uint8Array(ct), iv.length)
  return toBase64(out)
}

export async function openRecord(keys: SyncKeys, rid: string, payload: string): Promise<SyncRecord> {
  try {
    const bytes = fromBase64(payload)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: aad(keys.spaceId, rid) },
      keys.encKey,
      bytes.subarray(12),
    )
    return SyncRecordSchema.parse(JSON.parse(new TextDecoder().decode(plain)))
  } catch {
    throw new Error('No se pudo abrir el registro')
  }
}
