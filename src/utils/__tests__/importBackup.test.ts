import { describe, it, expect, vi, beforeEach } from 'vitest'
import { importBackup } from '../importBackup'

// Mock Dexie db — importBackup never reaches the DB in the error paths we test here
vi.mock('../../db/db', () => ({
  db: {
    transaction: vi.fn(),
    profiles: { clear: vi.fn(), bulkAdd: vi.fn() },
    diaryEntries: { clear: vi.fn(), bulkAdd: vi.fn() },
    growthRecords: { clear: vi.fn(), bulkAdd: vi.fn() },
    appConfig: { clear: vi.fn(), put: vi.fn() },
  },
}))

const toastMessages: string[] = []
vi.mock('../toast', () => ({
  showToast: (msg: string) => { toastMessages.push(msg) },
}))

beforeEach(() => { toastMessages.length = 0 })

describe('importBackup', () => {
  it('shows toast and returns false on SyntaxError (invalid JSON)', async () => {
    const result = await importBackup('not valid json {{{')
    expect(result).toBe(false)
    expect(toastMessages[0]).toContain('no es un backup válido')
  })

  it('shows toast and returns false on schemaVersion mismatch', async () => {
    const badVersion = JSON.stringify({ schemaVersion: 99, exportedAt: '', data: {} })
    const result = await importBackup(badVersion)
    expect(result).toBe(false)
    expect(toastMessages[0]).toContain('versión incompatible')
  })

  it('calls db.transaction and returns true for valid v1 backup', async () => {
    const { db } = await import('../../db/db')
    ;(db.transaction as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined)

    const valid = JSON.stringify({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: { profiles: [], diaryEntries: [], growthRecords: [], appConfig: null },
    })
    const result = await importBackup(valid)
    expect(result).toBe(true)
    expect(db.transaction).toHaveBeenCalled()
  })
})
