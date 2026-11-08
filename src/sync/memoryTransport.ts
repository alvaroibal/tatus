import { MAX_BATCH, MAX_BLOB_BYTES, TransportError, type PullRow, type PushRow, type Transport } from './transport'

// Servidor en memoria para los tests, con la misma semántica que
// supabase/migrations/20261107000000_sync.sql: upsert solo si (version, version_by)
// es mayor, seq global que se reasigna en cada aplicación, pull por seq, límites
// y pertenencia por usuario. Un MemoryServer se comparte; cada dispositivo usa
// su propio MemoryTransport (= su propio usuario anónimo).

const SPACE_RE = /^[0-9a-f]{32}$/
const HASH_RE = /^[0-9a-f]{64}$/
const MAX_JOIN_FAILURES = 10
const JOIN_WINDOW_MS = 60 * 60 * 1000
const MAX_RECORDS_PER_SPACE = 20000

interface StoredRow extends PullRow {
  space_id: string
}

interface JoinAttempts {
  windowStart: number
  failures: number
}

export class MemoryServer {
  readonly spaces = new Map<string, string>()          // id → auth_hash
  readonly members = new Map<string, Set<string>>()    // id → usuarios
  readonly records = new Map<string, StoredRow>()      // `${space}|${rid}` → fila
  readonly blobs = new Map<string, string>()           // ruta → texto
  readonly attempts = new Map<string, JoinAttempts>()  // `${space}|${user}`
  private seq = 0
  private users = 0

  newUser(): string {
    return `user-${++this.users}`
  }

  nextSeq(): number {
    return ++this.seq
  }

  isMember(spaceId: string, user: string): boolean {
    return this.members.get(spaceId)?.has(user) ?? false
  }

  addMember(spaceId: string, user: string): void {
    const set = this.members.get(spaceId) ?? new Set<string>()
    set.add(user)
    this.members.set(spaceId, set)
  }

  countRecords(spaceId: string): number {
    let n = 0
    for (const r of this.records.values()) if (r.space_id === spaceId) n++
    return n
  }
}

async function sha256Hex(hex: string): Promise<string> {
  const bytes = new Uint8Array(hex.match(/../g)!.map(h => parseInt(h, 16)))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

const byteLength = (s: string) => new TextEncoder().encode(s).length

/** (version, version_by) estrictamente mayor; version_by por código de carácter, como `collate "C"`. */
function isNewerVersion(a: { version: number; version_by: string }, b: { version: number; version_by: string }): boolean {
  if (a.version !== b.version) return a.version > b.version
  return a.version_by > b.version_by
}

export class MemoryTransport implements Transport {
  readonly server: MemoryServer
  private user: string | null = null

  constructor(server: MemoryServer) {
    this.server = server
  }

  private requireUser(): string {
    if (!this.user) throw new TransportError('denied')
    return this.user
  }

  private requireMember(spaceId: string): void {
    if (!this.server.isMember(spaceId, this.requireUser())) throw new TransportError('denied')
  }

  async signIn(): Promise<void> {
    this.user ??= this.server.newUser()
  }

  async createSpace(spaceId: string, authHashHex: string): Promise<void> {
    const user = this.requireUser()
    if (!SPACE_RE.test(spaceId) || !HASH_RE.test(authHashHex)) throw new TransportError('invalid')
    if (this.server.spaces.has(spaceId)) throw new TransportError('exists')
    this.server.spaces.set(spaceId, authHashHex)
    this.server.addMember(spaceId, user)
  }

  async joinSpace(spaceId: string, authSecretHex: string): Promise<void> {
    const user = this.requireUser()
    if (!SPACE_RE.test(spaceId) || !HASH_RE.test(authSecretHex)) throw new TransportError('invalid')
    const hash = this.server.spaces.get(spaceId)
    if (hash === undefined) throw new TransportError('denied')

    const key = `${spaceId}|${user}`
    const now = Date.now()
    const prev = this.server.attempts.get(key)
    const inWindow = prev !== undefined && prev.windowStart > now - JOIN_WINDOW_MS
    if (inWindow && prev.failures >= MAX_JOIN_FAILURES) throw new TransportError('locked')

    if (await sha256Hex(authSecretHex) === hash) {
      this.server.addMember(spaceId, user)
      this.server.attempts.delete(key)
      return
    }
    this.server.attempts.set(key, inWindow ? { ...prev, failures: prev.failures + 1 } : { windowStart: now, failures: 1 })
    throw new TransportError('denied') // HTTP 403
  }

  async push(spaceId: string, rows: PushRow[]): Promise<number> {
    this.requireMember(spaceId)
    if (rows.length > MAX_BATCH) throw new TransportError('invalid')
    // El SQL valida fila a fila y una excepción deshace toda la llamada:
    // validar todo antes de escribir es equivalente.
    for (const r of rows) {
      if (typeof r.version_by !== 'string' || r.version_by.length > 64) throw new TransportError('invalid')
      if (r.blob_path !== null && r.blob_path !== `${spaceId}/${r.rid}`) throw new TransportError('invalid')
      if (r.rid.length < 40 || r.rid.length > 64) throw new TransportError('invalid')
      if (r.payload !== null && r.payload.length > MAX_BLOB_BYTES) throw new TransportError('invalid')
    }

    const next = new Map(this.server.records)
    let applied = 0
    for (const r of rows) {
      const key = `${spaceId}|${r.rid}`
      const prev = next.get(key)
      if (prev && !isNewerVersion(r, prev)) continue
      next.set(key, { space_id: spaceId, rid: r.rid, version: r.version, version_by: r.version_by, payload: r.payload, blob_path: r.blob_path, seq: this.server.nextSeq() })
      applied++
    }
    let count = 0
    for (const r of next.values()) if (r.space_id === spaceId) count++
    if (count > MAX_RECORDS_PER_SPACE) throw new TransportError('quota')

    this.server.records.clear()
    for (const [k, v] of next) this.server.records.set(k, v)
    return applied
  }

  async pull(spaceId: string, after: number, limit: number): Promise<PullRow[]> {
    this.requireMember(spaceId)
    const max = Math.max(1, Math.min(limit, MAX_BATCH))
    return [...this.server.records.values()]
      .filter(r => r.space_id === spaceId && r.seq > after)
      .sort((a, b) => a.seq - b.seq)
      .slice(0, max)
      .map(r => ({ rid: r.rid, version: r.version, version_by: r.version_by, payload: r.payload, blob_path: r.blob_path, seq: r.seq }))
  }

  async putBlob(path: string, text: string): Promise<void> {
    this.requireMember(path.split('/')[0])
    if (byteLength(text) > MAX_BLOB_BYTES) throw new TransportError('invalid') // 413 del bucket
    this.server.blobs.set(path, text)
  }

  async getBlob(path: string): Promise<string> {
    this.requireMember(path.split('/')[0])
    const text = this.server.blobs.get(path)
    if (text === undefined) throw new TransportError('not_found')
    return text
  }
}
