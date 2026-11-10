import { describe, it, expect } from 'vitest'
import { BACKUP_FIRST_ITEMS, BACKUP_REMIND_DAYS, BACKUP_REMIND_ITEMS, isBackupDue } from '../backupStatus'

const DAY = 86_400_000
const NOW = Date.UTC(2026, 10, 10)

describe('isBackupDue', () => {
  it('no avisa si no hay nada que perder', () => {
    expect(isBackupDue({}, 0, NOW)).toBe(false)
  })

  it('sin ninguna copia, espera a que haya unos pocos recuerdos', () => {
    expect(isBackupDue({}, BACKUP_FIRST_ITEMS - 1, NOW)).toBe(false)
    expect(isBackupDue({}, BACKUP_FIRST_ITEMS, NOW)).toBe(true)
  })

  it('avisa cuando la última copia es antigua', () => {
    const state = { lastBackupAt: NOW - (BACKUP_REMIND_DAYS - 1) * DAY, lastBackupItems: 10 }
    expect(isBackupDue(state, 10, NOW)).toBe(false)
    expect(isBackupDue({ ...state, lastBackupAt: NOW - BACKUP_REMIND_DAYS * DAY }, 10, NOW)).toBe(true)
  })

  it('avisa cuando hay muchos recuerdos nuevos aunque la copia sea reciente', () => {
    const state = { lastBackupAt: NOW - DAY, lastBackupItems: 10 }
    expect(isBackupDue(state, 10 + BACKUP_REMIND_ITEMS - 1, NOW)).toBe(false)
    expect(isBackupDue(state, 10 + BACKUP_REMIND_ITEMS, NOW)).toBe(true)
  })

  it('una copia recién hecha no avisa', () => {
    expect(isBackupDue({ lastBackupAt: NOW, lastBackupItems: 300 }, 300, NOW)).toBe(false)
  })
})
