import { db, type SyncState } from '../db/db'

// Único registro con la seed de la familia en este dispositivo.

export function getSyncState(): Promise<SyncState | undefined> {
  return db.syncState.get('self')
}

export async function saveSyncState(state: SyncState): Promise<void> {
  await db.syncState.put(state)
}

export function clearSyncState(): Promise<void> {
  return db.syncState.delete('self')
}
