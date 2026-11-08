import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { parsePullRows, TransportError, type PullRow, type PushRow, type Transport, type TransportErrorCode } from './transport'

// Transporte real. Este módulo solo se carga con import() desde runner.ts:
// @supabase/supabase-js nunca entra en el paquete inicial.

const BUCKET = 'sync-blobs'
/** Esperas entre reintentos ante errores de red (no ante 4xx). */
export const RETRY_DELAYS_MS = [1000, 3000, 9000]

const PG_CODES: Record<string, TransportErrorCode> = {
  '42501': 'denied',
  '22023': 'invalid',
  '23505': 'exists',
  P0001: 'locked',
  '54000': 'quota',
}

// Sin respuesta (status 0) o pasarela caída: es la red, se puede reintentar.
const isNetworkStatus = (status: number | undefined) => !status || status === 502 || status === 503 || status === 504

/** Traduce una respuesta fallida a un código sin datos. */
export function classify(status: number | undefined, pgCode?: string): TransportErrorCode {
  if (pgCode && PG_CODES[pgCode]) return PG_CODES[pgCode]
  if (isNetworkStatus(status)) return 'network'
  if (status === 401 || status === 403) return 'denied'
  if (status === 404) return 'not_found'
  if (status === 400 || status === 413 || status === 422) return 'invalid'
  return 'unknown'
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Primer intento + un reintento por cada espera de RETRY_DELAYS_MS, solo si el fallo es de red. */
export async function withRetry<T>(op: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await op()
    } catch (e) {
      const network = e instanceof TransportError && e.code === 'network'
      if (!network || i >= RETRY_DELAYS_MS.length) throw e
      await sleep(RETRY_DELAYS_MS[i])
    }
  }
}

interface RpcResult {
  data: unknown
  error: { code?: string } | null
  status: number
}

/** Lo mínimo del error de Storage que se usa (StorageApiError tiene status; StorageUnknownError es la red). */
function storageCode(error: unknown): TransportErrorCode {
  const status = (error as { status?: unknown }).status
  return classify(typeof status === 'number' ? status : undefined)
}

export class SupabaseTransport implements Transport {
  private readonly client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tatus-sync-auth' },
    })
  }

  private rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
    return withRetry(async () => {
      const { data, error, status } = await this.client.rpc(fn, args) as RpcResult
      // join_space con secreto malo responde 403 sin cuerpo: también es un fallo.
      if (error || status >= 400) throw new TransportError(classify(status, error?.code))
      return data
    })
  }

  async signIn(): Promise<void> {
    await withRetry(async () => {
      const { data, error } = await this.client.auth.getSession()
      if (error) throw new TransportError(classify(error.status))
      if (data.session) return
      const res = await this.client.auth.signInAnonymously()
      if (res.error) throw new TransportError(classify(res.error.status))
    })
  }

  async createSpace(spaceId: string, authHashHex: string): Promise<void> {
    await this.rpc('create_space', { p_id: spaceId, p_auth_hash: authHashHex })
  }

  async joinSpace(spaceId: string, authSecretHex: string): Promise<void> {
    await this.rpc('join_space', { p_id: spaceId, p_auth_secret: authSecretHex })
  }

  async push(spaceId: string, rows: PushRow[]): Promise<number> {
    const n = await this.rpc('push_records', { p_space: spaceId, p_records: rows })
    if (typeof n !== 'number') throw new TransportError('invalid')
    return n
  }

  async pull(spaceId: string, after: number, limit: number): Promise<PullRow[]> {
    return parsePullRows(await this.rpc('pull_records', { p_space: spaceId, p_after: after, p_limit: limit }))
  }

  async putBlob(path: string, text: string): Promise<void> {
    await withRetry(async () => {
      const { error } = await this.client.storage.from(BUCKET)
        .upload(path, new Blob([text], { type: 'text/plain' }), { upsert: true, contentType: 'text/plain' })
      if (error) throw new TransportError(storageCode(error))
    })
  }

  async getBlob(path: string): Promise<string> {
    return withRetry(async () => {
      const { data, error } = await this.client.storage.from(BUCKET).download(path)
      if (error) throw new TransportError(storageCode(error))
      return data.text()
    })
  }
}

/** Transporte con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY, o null si faltan (sync no disponible). */
export function createSupabaseTransport(): SupabaseTransport | null {
  const url = import.meta.env.VITE_SUPABASE_URL
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY
  return url && key ? new SupabaseTransport(url, key) : null
}
