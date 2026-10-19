import Dexie, { type EntityTable } from 'dexie'

export type ProfilePhase = 'trying' | 'expecting'
export type BabySex = 'boy' | 'girl'

export interface BabyProfile {
  id?: number
  name: string
  birthDate: Date        // real or estimated due date (placeholder while trying)
  createdAt: Date
  phase?: ProfilePhase   // 'trying' = buscando embarazo; undefined = según birthDate
  sex?: BabySex          // para percentiles OMS
  lastPeriod?: Date      // FUR / última regla (modo buscando)
  cycleLength?: number   // días (modo buscando)
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
  headCm?: number
}

export interface AppConfig {
  id: 1
  activeProfileId: number
  partnerName?: string
  parentName?: string
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

export type CareType = 'breast' | 'bottle' | 'diaper' | 'sleep' | 'med' | 'pump'

export interface CareLog {
  id?: number
  profileId: number
  type: CareType
  start: Date
  end?: Date                         // undefined while a timer is running
  side?: 'L' | 'R'                   // breast
  amountMl?: number                  // bottle / pump / med dose
  milk?: 'formula' | 'breast'        // bottle content
  diaper?: 'wet' | 'dirty' | 'both'
  medName?: string
  note?: string
}

export interface Appointment {
  id?: number
  profileId: number
  date: Date
  title: string
  kind: 'eco' | 'pediatra' | 'matrona' | 'vacuna' | 'analitica' | 'otro'
  notes?: string
  done: boolean
}

export interface CheckState {
  key: string        // `${profileId}|${listId}|${itemId}`
  profileId: number
  done: boolean
}

class TatusDB extends Dexie {
  profiles!: EntityTable<BabyProfile, 'id'>
  diaryEntries!: EntityTable<DiaryEntry, 'id'>
  growthRecords!: Dexie.Table<GrowthRecord>
  appConfig!: Dexie.Table<AppConfig, number>
  futureLetters!: EntityTable<FutureLetter, 'id'>
  entryPhotos!: EntityTable<EntryPhoto, 'id'>
  careLogs!: EntityTable<CareLog, 'id'>
  appointments!: EntityTable<Appointment, 'id'>
  checks!: Dexie.Table<CheckState, string>

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
    this.version(4).stores({
      profiles: '++id,name',
      diaryEntries: '++id,profileId,date,week,milestone',
      growthRecords: '[profileId+week],date',
      appConfig: 'id',
      futureLetters: '++id,profileId,date,week',
      entryPhotos: '++id,diaryEntryId',
      careLogs: '++id,profileId,start,type',
      appointments: '++id,profileId,date',
      checks: 'key,profileId',
    }).upgrade(async tx => {
      // Antes de v4 el nombre de la pareja estaba fijado en el contenido.
      // Se conserva para las instalaciones existentes; se puede cambiar en Ajustes.
      await tx.table('appConfig').toCollection().modify((c: AppConfig) => {
        if (c.partnerName === undefined) c.partnerName = 'Natalia'
      })
    })
  }
}

export const db = new TatusDB()
