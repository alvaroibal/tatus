import { describe, it, expect, vi, afterEach } from 'vitest'
import { getPersistState, requestPersistentStorage } from '../persistStorage'

function stubStorage(storage: Partial<StorageManager> | undefined) {
  vi.stubGlobal('navigator', { ...navigator, storage })
}

afterEach(() => { vi.unstubAllGlobals() })

describe('persistencia del almacenamiento', () => {
  it('sin API de almacenamiento informa de que no está soportada', async () => {
    stubStorage(undefined)
    expect(await getPersistState()).toBe('unsupported')
    expect(await requestPersistentStorage()).toBe('unsupported')
  })

  it('pide la persistencia solo si aún no la tiene', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist })
    expect(await requestPersistentStorage()).toBe('persisted')
    expect(persist).toHaveBeenCalledOnce()
  })

  it('no vuelve a pedirla si ya está concedida', async () => {
    const persist = vi.fn()
    stubStorage({ persisted: vi.fn().mockResolvedValue(true), persist })
    expect(await requestPersistentStorage()).toBe('persisted')
    expect(persist).not.toHaveBeenCalled()
  })

  it('si el navegador la deniega o falla, no rompe', async () => {
    stubStorage({ persisted: vi.fn().mockResolvedValue(false), persist: vi.fn().mockRejectedValue(new Error('x')) })
    expect(await requestPersistentStorage()).toBe('not-persisted')
  })
})
