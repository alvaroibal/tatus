import { useState } from 'react'
import { syncNow, type SyncResult } from '../sync/runner'
import { useSyncStatus } from '../sync/useSyncStatus'

// Temporal (Fase 3): solo se carga con import.meta.env.DEV. La Fase 4 lo sustituye
// por las pantallas de sincronización. No muestra seed, llaves ni contenido.

export default function SyncDebug() {
  const status = useSyncStatus()
  const [result, setResult] = useState<SyncResult | null>(null)

  const handleSync = async () => setResult(await syncNow())
  const last = status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleTimeString('es-ES') : '—'

  return (
    <section className="px-5 mb-6">
      <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-4 text-xs text-gray-700 space-y-1">
        <p className="text-sm font-medium text-gray-900">Sync (debug)</p>
        <p>Estado: <b>{status.state}</b> · Pendientes: {status.pending} · Última: {last}</p>
        {status.lastError && <p className="text-red-700">{status.lastError}</p>}
        {result && (
          <p className="font-mono">
            {result.status} · subidos {result.pushed} · bajados {result.pulled} · aplicados {result.applied}
            {' '}· descartados {result.discarded} · aplazados {result.deferred} · grandes {result.tooLarge}
          </p>
        )}
        <button
          onClick={handleSync}
          disabled={status.state === 'syncing'}
          className="mt-2 bg-tinta-600 text-leche rounded-2xl px-4 py-2 text-sm disabled:opacity-50"
        >
          Sincronizar ahora
        </button>
      </div>
    </section>
  )
}
