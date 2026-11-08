import { describe, it, expect, vi } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import 'fake-indexeddb/auto'
import { MemoryServer, MemoryTransport } from '../memoryTransport'
import { TransportError } from '../transport'
import { setTransport, enableSync, syncNow, stopSync } from '../runner'
import { useSyncStatus, type SyncStatus } from '../useSyncStatus'

// Sin @testing-library: un componente mínimo que pinta el valor del hook en JSON.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const store = new Map<string, string>()
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => store.clear(),
})

function Probe() {
  return <pre>{JSON.stringify(useSyncStatus())}</pre>
}

const container = document.createElement('div')
const read = (): SyncStatus => JSON.parse(container.textContent || '{}')

async function settle() {
  for (let i = 0; i < 5; i++) await act(() => new Promise(r => setTimeout(r, 20)))
}

describe('useSyncStatus', () => {
  it('unavailable → off → idle → error, con pendientes y lastError genérico', async () => {
    const root = createRoot(container)
    await act(async () => root.render(<Probe />))
    await settle()
    expect(read().state).toBe('unavailable') // en los tests no hay VITE_SUPABASE_*

    const transport = new MemoryTransport(new MemoryServer())
    setTransport(transport)
    await act(async () => root.render(<Probe />))
    await settle()
    expect(read()).toMatchObject({ state: 'off', pending: 0 })

    await act(async () => { await enableSync() })
    await settle()
    expect(read().state).toBe('idle')
    expect(read().lastSyncAt).toBeGreaterThan(0)

    const { db } = await import('../../db/db')
    await act(async () => { await db.profiles.add({ name: 'Bebé', birthDate: new Date(), createdAt: new Date() }) })
    await settle()
    expect(read().pending).toBe(1)

    vi.spyOn(transport, 'push').mockRejectedValue(new TransportError('network'))
    await act(async () => { await syncNow() })
    await settle()
    expect(read()).toMatchObject({ state: 'error', pending: 1, lastError: 'No hay conexión con el servidor. Se volverá a intentar.' })

    stopSync()
    root.unmount()
  })
})
