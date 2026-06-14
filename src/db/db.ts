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

export interface FutureLetter {
  id?: number
  profileId: number
  date: Date
  week: number           // negative = prenatal, 0+ = postnatal
  pregnancyWeek?: number // set when week < 0: 40 + week
  title?: string
  body: string
  locked: boolean
}

export interface EntryPhoto {
  id?: number
  diaryEntryId: number
  dataUrl: string  // compressed JPEG base64
}

class TatusDB extends Dexie {
  profiles!: EntityTable<BabyProfile, 'id'>
  diaryEntries!: EntityTable<DiaryEntry, 'id'>
  growthRecords!: Dexie.Table<GrowthRecord>
  appConfig!: Dexie.Table<AppConfig, number>
  futureLetters!: EntityTable<FutureLetter, 'id'>
  entryPhotos!: EntityTable<EntryPhoto, 'id'>

  constructor() {
    super('tatus-db')
    this.version(1).stores({
      profiles: '++id,name',
      diaryEntries: '++id,profileId,date,week,milestone',
      growthRecords: '[profileId+week],date',
      appConfig: 'id',
    })
    this.version(2).stores({
      profiles: '++id,name',
      diaryEntries: '++id,profileId,date,week,milestone',
      growthRecords: '[profileId+week],date',
      appConfig: 'id',
      futureLetters: '++id,profileId,date,week',
    })
    this.version(3).stores({
      profiles: '++id,name',
      diaryEntries: '++id,profileId,date,week,milestone',
      growthRecords: '[profileId+week],date',
      appConfig: 'id',
      futureLetters: '++id,profileId,date,week',
      entryPhotos: '++id,diaryEntryId',
    })
  }
}

export const db = new TatusDB()
