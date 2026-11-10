// Pide al navegador que no borre los datos de Tatuś cuando le falte espacio.
// En iOS ayuda sobre todo con la app instalada en la pantalla de inicio.

export type PersistState = 'persisted' | 'not-persisted' | 'unsupported'

function storageManager(): StorageManager | undefined {
  return typeof navigator !== 'undefined' ? navigator.storage : undefined
}

export async function getPersistState(): Promise<PersistState> {
  const sm = storageManager()
  if (!sm?.persisted) return 'unsupported'
  try {
    return (await sm.persisted()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'unsupported'
  }
}

/** Pide la persistencia si aún no la tiene. Nunca lanza. */
export async function requestPersistentStorage(): Promise<PersistState> {
  const sm = storageManager()
  if (!sm?.persist) return 'unsupported'
  const current = await getPersistState()
  if (current !== 'not-persisted') return current
  try {
    return (await sm.persist()) ? 'persisted' : 'not-persisted'
  } catch {
    return 'not-persisted'
  }
}
