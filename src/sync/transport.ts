import { z } from 'zod'

// Contrato entre el runner y el servidor de sincronización. El servidor solo ve
// ids opacos, versiones y bloques cifrados; nada de esto lleva contenido en claro.

/** Máximo de registros por push y por pull (igual que el SQL). */
export const MAX_BATCH = 500
/** Máximo de un payload o de un objeto de Storage, en bytes (igual que el SQL y el bucket). */
export const MAX_BLOB_BYTES = 1048576

/** Fila que se sube con push_records. */
export interface PushRow {
  rid: string
  version: number
  version_by: string
  payload: string | null
  blob_path: string | null
}

// Lo que llega del servidor no es de fiar: se valida antes de usarlo.
export const PullRowSchema = z.object({
  rid: z.string().min(40).max(64),
  version: z.number().int(),
  version_by: z.string().max(64),
  payload: z.string().nullable(),
  blob_path: z.string().nullable(),
  seq: z.number().int(),
})

/** Fila que devuelve pull_records, ordenada por seq. */
export type PullRow = z.infer<typeof PullRowSchema>

export function parsePullRows(data: unknown): PullRow[] {
  const parsed = z.array(PullRowSchema).safeParse(data)
  if (!parsed.success) throw new TransportError('invalid')
  return parsed.data
}

/**
 * Tipos de fallo, sin datos:
 * network = no hay conexión o el servidor no responde · denied = sin sesión, no miembro o secreto malo (42501/403) ·
 * invalid = parámetro inválido (22023) · exists = la familia ya existe (23505) · locked = demasiados intentos (P0001) ·
 * quota = cuota de la familia (54000) · not_found = el objeto no existe · unknown = otro.
 */
export type TransportErrorCode = 'network' | 'denied' | 'invalid' | 'exists' | 'locked' | 'quota' | 'not_found' | 'unknown'

export class TransportError extends Error {
  readonly code: TransportErrorCode
  constructor(code: TransportErrorCode) {
    super(`Error de sincronización (${code})`)
    this.name = 'TransportError'
    this.code = code
  }
}

// Por nombre y no por instanceof: en los tests cada "dispositivo" carga su propia copia del módulo.
export function isTransportError(e: unknown): e is TransportError {
  return e instanceof Error && e.name === 'TransportError' && typeof (e as { code?: unknown }).code === 'string'
}

export interface Transport {
  /** Sesión anónima (se reutiliza si ya existe). */
  signIn(): Promise<void>
  createSpace(spaceId: string, authHashHex: string): Promise<void>
  joinSpace(spaceId: string, authSecretHex: string): Promise<void>
  /** Devuelve cuántos registros aplicó el servidor (los más antiguos que lo guardado se ignoran). */
  push(spaceId: string, rows: PushRow[]): Promise<number>
  pull(spaceId: string, after: number, limit: number): Promise<PullRow[]>
  putBlob(path: string, text: string): Promise<void>
  getBlob(path: string): Promise<string>
}
