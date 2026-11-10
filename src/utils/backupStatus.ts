import { db } from '../db/db'

// Cuándo recordar la copia de seguridad. Mientras la sincronización no esté
// activa, la copia manual es la única protección del archivo.

/** Días sin copia a partir de los que se recuerda hacer una. */
export const BACKUP_REMIND_DAYS = 28
/** Recuerdos nuevos (entradas, cartas, fotos, medidas) que justifican una copia. */
export const BACKUP_REMIND_ITEMS = 20
/** Con menos recuerdos que estos aún no se molesta a quien nunca ha hecho copia. */
export const BACKUP_FIRST_ITEMS = 5

const DAY_MS = 86_400_000

export interface BackupState {
  lastBackupAt?: number
  lastBackupItems?: number
}

/** Decide si toca recordar la copia. Función pura para poder probarla. */
export function isBackupDue(state: BackupState, itemsNow: number, now: number = Date.now()): boolean {
  if (itemsNow === 0) return false
  if (state.lastBackupAt === undefined) return itemsNow >= BACKUP_FIRST_ITEMS
  const days = (now - state.lastBackupAt) / DAY_MS
  const newItems = itemsNow - (state.lastBackupItems ?? 0)
  return days >= BACKUP_REMIND_DAYS || newItems >= BACKUP_REMIND_ITEMS
}

/** Recuerdos que se perderían sin copia: lo que la familia escribe o guarda. */
export async function countArchiveItems(): Promise<number> {
  const counts = await Promise.all([
    db.diaryEntries.count(),
    db.futureLetters.count(),
    db.entryPhotos.count(),
    db.growthRecords.count(),
  ])
  return counts.reduce((a, b) => a + b, 0)
}

/** Guarda en la configuración de este móvil cuándo se hizo la última copia. */
export async function markBackupDone(items: number, now: number = Date.now()): Promise<void> {
  await db.appConfig.update(1, { lastBackupAt: now, lastBackupItems: items })
}

export function formatBackupDate(ts: number): string {
  return new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}
