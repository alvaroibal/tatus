import { useSyncExternalStore } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getSyncState } from './keyStore'
import { isSyncAvailable, isSyncing, subscribeSyncing } from './runner'

export type SyncStatusState = 'off' | 'unavailable' | 'idle' | 'syncing' | 'error'

export interface SyncStatus {
  state: SyncStatusState
  lastSyncAt?: number
  /** Cambios locales pendientes de subir (filas de syncChanges). */
  pending: number
  /** Mensaje genérico en español; nunca lleva datos. */
  lastError?: string
}

/** Estado de la sincronización para la UI. */
export function useSyncStatus(): SyncStatus {
  const syncing = useSyncExternalStore(subscribeSyncing, isSyncing, isSyncing)
  const saved = useLiveQuery(() => getSyncState(), [])
  const pending = useLiveQuery(() => db.syncChanges.count(), [], 0)

  const base = { lastSyncAt: saved?.lastSyncAt, pending, lastError: saved?.lastError }
  if (!isSyncAvailable()) return { ...base, state: 'unavailable' }
  if (!saved?.enabled) return { ...base, state: 'off' }
  if (syncing) return { ...base, state: 'syncing' }
  return { ...base, state: saved.lastError ? 'error' : 'idle' }
}
