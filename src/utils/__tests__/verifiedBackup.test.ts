import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from '../../db/db'
import { currentCounts, exportVerifiedBackup, verifyBackup } from '../importBackup'
import { countArchiveItems, markBackupDone } from '../backupStatus'

async function seed() {
  const profileId = await db.profiles.add({ name: 'Prueba', birthDate: new Date('2026-03-01') } as Parameters<typeof db.profiles.add>[0]) as number
  await db.appConfig.put({ id: 1, activeProfileId: profileId })
  await db.diaryEntries.add({ profileId, date: new Date(), week: 10, text: 'primera sonrisa', milestone: true } as Parameters<typeof db.diaryEntries.add>[0])
  await db.futureLetters.add({ profileId, date: new Date(), week: 10, body: 'Querido hijo', locked: false } as Parameters<typeof db.futureLetters.add>[0])
}

beforeEach(async () => {
  await Promise.all(db.tables.map(t => t.clear()))
})

describe('backup verificado', () => {
  it('genera una copia que se vuelve a leer con los mismos datos', async () => {
    await seed()
    const backup = await exportVerifiedBackup()
    expect(backup.ok).toBe(true)
    expect(backup.items).toBe(2) // 1 entrada + 1 carta
    expect(JSON.parse(backup.json).data.diaryEntries[0].text).toBe('primera sonrisa')
  })

  it('rechaza una copia corrupta, de otra versión o incompleta', async () => {
    await seed()
    const counts = await currentCounts()
    const { json } = await exportVerifiedBackup()
    expect(verifyBackup(json.slice(0, -10), counts)).toBe(false)
    expect(verifyBackup(json.replace('"schemaVersion": 5', '"schemaVersion": 4'), counts)).toBe(false)
    expect(verifyBackup(json, { ...counts, diaryEntries: counts.diaryEntries + 1 })).toBe(false)
  })

  it('guarda la fecha y los recuerdos de la última copia en la configuración de este móvil', async () => {
    await seed()
    await markBackupDone(await countArchiveItems(), 1_700_000_000_000)
    const config = await db.appConfig.get(1)
    expect(config?.lastBackupAt).toBe(1_700_000_000_000)
    expect(config?.lastBackupItems).toBe(2)
  })
})
