import Dexie, { type EntityTable } from 'dexie'

export interface BabyProfile {
  id?: number
  name: string
  birthDate: Date
  createdAt: Date
}

export interface DiaryEntry {
  id?: number
  profileId: number
  date: Date
  week: number
  text: string
  milestone: boolean
}

export interface GrowthRecord {
  profileId: number  // compound PK — no auto-increment id
  week: number       // compound PK
  date: Date
  weightKg?: number
  heightCm?: number
}

export interface AppConfig {
  id: 1
  activeProfileId: number
}

class TatusDB extends Dexie {
  profiles!: EntityTable<BabyProfile, 'id'>
  diaryEntries!: EntityTable<DiaryEntry, 'id'>
  growthRecords!: Dexie.Table<GrowthRecord>
  appConfig!: Dexie.Table<AppConfig, number>

  constructor() {
    super('tatus-db')
    this.version(1).stores({
      profiles: '++id,name',
      diaryEntries: '++id,profileId,date,week,milestone',
      growthRecords: '[profileId+week],date',
      appConfig: 'id',
    })
  }
}

export const db = new TatusDB()
