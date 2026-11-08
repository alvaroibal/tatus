import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Cliente de Supabase falso: solo lo que usa SupabaseTransport.
const rpc = vi.fn()
const download = vi.fn()
const upload = vi.fn()
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc,
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: {}, error: null }),
    },
    storage: { from: () => ({ upload, download }) },
  }),
}))

const { SupabaseTransport, classify } = await import('../supabaseTransport')

const SPACE = 'a'.repeat(32)
const t = () => new SupabaseTransport('http://localhost', 'anon')

beforeEach(() => {
  vi.useFakeTimers()
  rpc.mockReset()
  download.mockReset()
  upload.mockReset()
})
afterEach(() => vi.useRealTimers())

describe('SupabaseTransport', () => {
  it('traduce los códigos del servidor sin datos', () => {
    expect(classify(403, '42501')).toBe('denied')
    expect(classify(400, '22023')).toBe('invalid')
    expect(classify(409, '23505')).toBe('exists')
    expect(classify(400, 'P0001')).toBe('locked')
    expect(classify(500, '54000')).toBe('quota')
    expect(classify(403)).toBe('denied')
    expect(classify(0)).toBe('network')
    expect(classify(503)).toBe('network')
  })

  it('reintenta ante errores de red con esperas de 1 s, 3 s y 9 s', async () => {
    const fail = { data: null, error: { message: 'TypeError: Failed to fetch', code: '' }, status: 0 }
    rpc.mockResolvedValueOnce(fail).mockResolvedValueOnce(fail).mockResolvedValueOnce(fail).mockResolvedValueOnce({ data: 3, error: null, status: 200 })
    const p = t().push(SPACE, [])
    await vi.advanceTimersByTimeAsync(999)
    expect(rpc).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(rpc).toHaveBeenCalledTimes(2)
    await vi.advanceTimersByTimeAsync(3000)
    expect(rpc).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(9000)
    expect(await p).toBe(3)
    expect(rpc).toHaveBeenCalledTimes(4)
  })

  it('tras agotar los reintentos falla con "network"', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '' }, status: 0 })
    const p = t().pull(SPACE, 0, 500)
    const check = expect(p).rejects.toMatchObject({ code: 'network' })
    await vi.advanceTimersByTimeAsync(13000)
    await check
    expect(rpc).toHaveBeenCalledTimes(4)
  })

  it('no reintenta ante 4xx: secreto malo = 403 sin cuerpo', async () => {
    rpc.mockResolvedValue({ data: null, error: null, status: 403 })
    await expect(t().joinSpace(SPACE, '1'.repeat(64))).rejects.toMatchObject({ code: 'denied' })
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('valida con Zod lo que devuelve pull_records', async () => {
    rpc.mockResolvedValue({ data: [{ rid: 'x', seq: 'no' }], error: null, status: 200 })
    await expect(t().pull(SPACE, 0, 500)).rejects.toMatchObject({ code: 'invalid' })
    expect(rpc).toHaveBeenCalledWith('pull_records', { p_space: SPACE, p_after: 0, p_limit: 500 })
  })

  it('Storage: error con status no se reintenta; sin status es la red', async () => {
    download.mockResolvedValueOnce({ data: null, error: { status: 400 } })
    await expect(t().getBlob(`${SPACE}/r`)).rejects.toMatchObject({ code: 'invalid' })
    upload.mockResolvedValueOnce({ error: { name: 'StorageUnknownError' } }).mockResolvedValueOnce({ error: null })
    const p = t().putBlob(`${SPACE}/r`, 'cifrado')
    await vi.advanceTimersByTimeAsync(1000)
    await p
    expect(upload).toHaveBeenCalledTimes(2)
  })
})
