import { db } from '../db/db'
import { showToast } from './toast'

export interface BackupEnvelope {
  schemaVersion: number
  exportedAt: string
  data: {
    profiles: unknown[]
    diaryEntries: unknown[]
    growthRecords: unknown[]
    appConfig: unknown
    futureLetters?: unknown[]
    entryPhotos?: unknown[]
  }
}

export async function importBackup(fileContent: string): Promise<boolean> {
  let parsed: unknown
  try {
    parsed = JSON.parse(fileContent)
  } catch {
    showToast('Este archivo no es un backup válido de Tatuś.')
    return false
  }

  const envelope = parsed as BackupEnvelope
  if (![1, 2, 3].includes(envelope?.schemaVersion)) {
    showToast('Este archivo es de una versión incompatible.')
    return false
  }

  await db.transaction('rw', [db.profiles, db.diaryEntries, db.growthRecords, db.appConfig, db.futureLetters, db.entryPhotos], async () => {
    await db.profiles.clear()
    await db.diaryEntries.clear()
    await db.growthRecords.clear()
    await db.appConfig.clear()
    await db.futureLetters.clear()
    await db.entryPhotos.clear()

    await db.profiles.bulkAdd(envelope.data.profiles as Parameters<typeof db.profiles.bulkAdd>[0])
    await db.diaryEntries.bulkAdd(envelope.data.diaryEntries as Parameters<typeof db.diaryEntries.bulkAdd>[0])
    await db.growthRecords.bulkAdd(envelope.data.growthRecords as Parameters<typeof db.growthRecords.bulkAdd>[0])
    if (envelope.data.appConfig) {
      await db.appConfig.put(envelope.data.appConfig as Parameters<typeof db.appConfig.put>[0])
    }
    if (envelope.data.futureLetters?.length) {
      await db.futureLetters.bulkAdd(envelope.data.futureLetters as Parameters<typeof db.futureLetters.bulkAdd>[0])
    }
    if (envelope.data.entryPhotos?.length) {
      await db.entryPhotos.bulkAdd(envelope.data.entryPhotos as Parameters<typeof db.entryPhotos.bulkAdd>[0])
    }
  })

  return true
}

export function exportBackup(): Promise<string> {
  return db.transaction('r', [db.profiles, db.diaryEntries, db.growthRecords, db.appConfig, db.futureLetters, db.entryPhotos], async () => {
    const [profiles, diaryEntries, growthRecords, appConfigArr, futureLetters, entryPhotos] = await Promise.all([
      db.profiles.toArray(),
      db.diaryEntries.toArray(),
      db.growthRecords.toArray(),
      db.appConfig.toArray(),
      db.futureLetters.toArray(),
      db.entryPhotos.toArray(),
    ])
    const envelope: BackupEnvelope = {
      schemaVersion: 3,
      exportedAt: new Date().toISOString(),
      data: {
        profiles,
        diaryEntries,
        growthRecords,
        appConfig: appConfigArr[0] ?? null,
        futureLetters,
        entryPhotos,
      },
    }
    return JSON.stringify(envelope, null, 2)
  })
}
