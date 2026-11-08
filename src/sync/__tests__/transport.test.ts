import { describe, it, expect, beforeEach } from 'vitest'
import { MemoryServer, MemoryTransport } from '../memoryTransport'
import { parsePullRows, type PushRow, type TransportErrorCode } from '../transport'

// Contrato de MemoryTransport frente a supabase/migrations/20261107000000_sync.sql
// (los mismos casos que las pruebas pgTAP de la Fase 2).

const SPACE = 'a'.repeat(32)
const OTHER = 'b'.repeat(32)
const SECRET = '11'.repeat(32)

async function sha256Hex(hex: string) {
  const bytes = new Uint8Array(hex.match(/../g)!.map(h => parseInt(h, 16)))
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
}

const rid = (n: number) => `rid-${String(n).padStart(40, '0')}`
const row = (n: number, version: number, by = 'dev-A', payload = `p${version}`): PushRow =>
  ({ rid: rid(n), version, version_by: by, payload, blob_path: null })

async function rejects(p: Promise<unknown>, code: TransportErrorCode) {
  await expect(p).rejects.toMatchObject({ name: 'TransportError', code })
}

let server: MemoryServer
let a: MemoryTransport

beforeEach(async () => {
  server = new MemoryServer()
  a = new MemoryTransport(server)
  await a.signIn()
  await a.createSpace(SPACE, await sha256Hex(SECRET))
})

describe('MemoryTransport: mismo contrato que el SQL', () => {
  it('sin sesión todo es 42501 (denied)', async () => {
    const anon = new MemoryTransport(server)
    await rejects(anon.createSpace(OTHER, await sha256Hex(SECRET)), 'denied')
    await rejects(anon.push(SPACE, []), 'denied')
    await rejects(anon.pull(SPACE, 0, 500), 'denied')
  })

  it('create_space: 23505 si existe, 22023 si el id no es válido', async () => {
    await rejects(a.createSpace(SPACE, await sha256Hex(SECRET)), 'exists')
    await rejects(a.createSpace('XYZ', await sha256Hex(SECRET)), 'invalid')
  })

  it('un no miembro no sube, no baja ni lee blobs', async () => {
    const b = new MemoryTransport(server)
    await b.signIn()
    await rejects(b.push(SPACE, [row(1, 1)]), 'denied')
    await rejects(b.pull(SPACE, 0, 500), 'denied')
    await a.putBlob(`${SPACE}/${rid(1)}`, 'x')
    await rejects(b.getBlob(`${SPACE}/${rid(1)}`), 'denied')
    await rejects(b.putBlob(`${SPACE}/${rid(2)}`, 'x'), 'denied')
  })

  it('join_space: secreto malo = 403, familia inexistente = 42501, 10 fallos bloquean (P0001)', async () => {
    const b = new MemoryTransport(server)
    await b.signIn()
    await rejects(b.joinSpace(OTHER, SECRET), 'denied')
    for (let i = 0; i < 10; i++) await rejects(b.joinSpace(SPACE, '22'.repeat(32)), 'denied')
    await rejects(b.joinSpace(SPACE, SECRET), 'locked')

    const c = new MemoryTransport(server)
    await c.signIn()
    await c.joinSpace(SPACE, SECRET)
    await c.joinSpace(SPACE, SECRET) // idempotente
    expect(await c.pull(SPACE, 0, 500)).toEqual([])
  })

  it('rechaza más de 500 registros por llamada', async () => {
    const rows = Array.from({ length: 501 }, (_, i) => row(i, 1))
    await rejects(a.push(SPACE, rows), 'invalid')
    expect(await a.pull(SPACE, 0, 500)).toEqual([])
    expect(await a.push(SPACE, rows.slice(0, 500))).toBe(500)
  })

  it('solo aplica si (version, version_by) es mayor; version_by por código de carácter', async () => {
    expect(await a.push(SPACE, [row(1, 10, 'dev-B', 'nuevo')])).toBe(1)
    expect(await a.push(SPACE, [row(1, 9, 'dev-Z', 'viejo')])).toBe(0)       // version más antigua
    expect(await a.push(SPACE, [row(1, 10, 'dev-A', 'empate')])).toBe(0)     // mismo ms, 'dev-A' < 'dev-B'
    expect(await a.push(SPACE, [row(1, 10, 'dev-B', 'igual')])).toBe(0)      // idéntica: no es mayor
    expect(await a.push(SPACE, [row(1, 10, 'dev-a', 'minúscula')])).toBe(1)  // 'a' (97) > 'B' (66)
    const [stored] = await a.pull(SPACE, 0, 500)
    expect(stored).toMatchObject({ version: 10, version_by: 'dev-a', payload: 'minúscula' })
  })

  it('blob_path nulo o exactamente {familia}/{rid}; version_by ≤ 64; payload ≤ 1 MB', async () => {
    await rejects(a.push(SPACE, [{ ...row(1, 1), blob_path: `${OTHER}/${rid(1)}` }]), 'invalid')
    await rejects(a.push(SPACE, [{ ...row(1, 1), blob_path: `${SPACE}/${rid(2)}` }]), 'invalid')
    await rejects(a.push(SPACE, [row(1, 1, 'x'.repeat(65))]), 'invalid')
    await rejects(a.push(SPACE, [row(1, 1, 'dev-A', 'x'.repeat(1048577))]), 'invalid')
    // Una fila mala deshace toda la llamada.
    await rejects(a.push(SPACE, [row(2, 1), { ...row(3, 1), blob_path: 'otra/ruta' }]), 'invalid')
    expect(await a.pull(SPACE, 0, 500)).toEqual([])

    expect(await a.push(SPACE, [{ ...row(1, 1), payload: null, blob_path: `${SPACE}/${rid(1)}` }])).toBe(1)
  })

  it('seq global y creciente, reasignado en cada aplicación; pull por seq con límite', async () => {
    await a.push(SPACE, [row(1, 1), row(2, 1), row(3, 1)])
    await a.push(SPACE, [row(1, 2)])
    const all = await a.pull(SPACE, 0, 500)
    expect(all.map(r => r.rid)).toEqual([rid(2), rid(3), rid(1)])
    expect(all.map(r => r.seq)).toEqual([...all.map(r => r.seq)].sort((x, y) => x - y))
    const page = await a.pull(SPACE, all[0].seq, 1)
    expect(page.map(r => r.rid)).toEqual([rid(3)])
    expect(await a.pull(SPACE, all[2].seq, 500)).toEqual([])
  })

  it('Storage: máx. 1 MB por objeto; objeto inexistente = not_found', async () => {
    await rejects(a.putBlob(`${SPACE}/${rid(1)}`, 'x'.repeat(1048577)), 'invalid')
    await rejects(a.getBlob(`${SPACE}/${rid(1)}`), 'not_found')
    await a.putBlob(`${SPACE}/${rid(1)}`, 'cifrado')
    expect(await a.getBlob(`${SPACE}/${rid(1)}`)).toBe('cifrado')
  })
})

describe('parsePullRows', () => {
  it('acepta filas válidas y rechaza las mal formadas', () => {
    const ok = { rid: rid(1), version: 1, version_by: 'A', payload: 'x', blob_path: null, seq: 3 }
    expect(parsePullRows([ok])).toEqual([ok])
    expect(() => parsePullRows([{ ...ok, seq: '3' }])).toThrow()
    expect(() => parsePullRows([{ ...ok, rid: 'corto' }])).toThrow()
    expect(() => parsePullRows({})).toThrow()
  })
})
