import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { countArchiveItems, isBackupDue } from '../utils/backupStatus'

export interface BackupStatus {
  lastBackupAt?: number
  due: boolean
}

/** Estado de la copia de seguridad de este móvil. undefined mientras carga. */
export function useBackupStatus(): BackupStatus | undefined {
  return useLiveQuery(async () => {
    const [config, items] = await Promise.all([db.appConfig.get(1), countArchiveItems()])
    return {
      lastBackupAt: config?.lastBackupAt,
      due: isBackupDue({ lastBackupAt: config?.lastBackupAt, lastBackupItems: config?.lastBackupItems }, items),
    }
  }, [])
}
