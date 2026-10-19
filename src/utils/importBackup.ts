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
    careLogs?: unknown[]
    appointments?: unknown[]
    checks?: unknown[]
  }
}

const ALL_TABLES = () => [
  db.profiles, db.diaryEntries, db.growthRecords, db.appConfig, db.futureLetters,
  db.entryPhotos, db.careLogs, db.appointments, db.checks,
]

export async function importBackup(fileContent: string): Promise<boolean> {
  let parsed: unknown
  try {
    parsed = JSON.parse(fileContent)
  } catch {
    showToast('Este archivo no es un backup válido de Tatuś.')
    return false
  }

  const envelope = parsed as BackupEnvelope
  if (![1, 2, 3, 4].includes(envelope?.schemaVersion)) {
    showToast('Este archivo es de una versión incompatible.')
    return false
  }

  await db.transaction('rw', ALL_TABLES(), async () => {
    for (const t of ALL_TABLES()) await t.clear()

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
    if (envelope.data.careLogs?.length) {
      await db.careLogs.bulkAdd(envelope.data.careLogs as Parameters<typeof db.careLogs.bulkAdd>[0])
    }
    if (envelope.data.appointments?.length) {
      await db.appointments.bulkAdd(envelope.data.appointments as Parameters<typeof db.appointments.bulkAdd>[0])
    }
    if (envelope.data.checks?.length) {
      await db.checks.bulkAdd(envelope.data.checks as Parameters<typeof db.checks.bulkAdd>[0])
    }
  })

  return true
}

export function exportBackup(): Promise<string> {
  return db.transaction('r', ALL_TABLES(), async () => {
    const [profiles, diaryEntries, growthRecords, appConfigArr, futureLetters, entryPhotos, careLogs, appointments, checks] = await Promise.all([
      db.profiles.toArray(),
      db.diaryEntries.toArray(),
      db.growthRecords.toArray(),
      db.appConfig.toArray(),
      db.futureLetters.toArray(),
      db.entryPhotos.toArray(),
      db.careLogs.toArray(),
      db.appointments.toArray(),
      db.checks.toArray(),
    ])
    const envelope: BackupEnvelope = {
      schemaVersion: 4,
      exportedAt: new Date().toISOString(),
      data: {
        profiles,
        diaryEntries,
        growthRecords,
        appConfig: appConfigArr[0] ?? null,
        futureLetters,
        entryPhotos,
        careLogs,
        appointments,
        checks,
      },
    }
    return JSON.stringify(envelope, null, 2)
  })
}

/** Borra un perfil y todo lo que cuelga de él. */
export async function deleteProfileData(profileId: number): Promise<void> {
  await db.transaction('rw', ALL_TABLES(), async () => {
    const entries = await db.diaryEntries.where('profileId').equals(profileId).toArray()
    const entryIds = entries.map(e => e.id!).filter(Boolean)
    await db.profiles.delete(profileId)
    await db.diaryEntries.where('profileId').equals(profileId).delete()
    await db.futureLetters.where('profileId').equals(profileId).delete()
    if (entryIds.length) await db.entryPhotos.where('diaryEntryId').anyOf(entryIds).delete()
    const growth = (await db.growthRecords.toArray())
      .filter(g => g.profileId === profileId)
      .map(g => [g.profileId, g.week] as [number, number])
    if (growth.length) await db.growthRecords.bulkDelete(growth)
    await db.careLogs.where('profileId').equals(profileId).delete()
    await db.appointments.where('profileId').equals(profileId).delete()
    await db.checks.where('profileId').equals(profileId).delete()
  })
}
