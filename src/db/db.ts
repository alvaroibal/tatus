import Dexie, { type EntityTable } from 'dexie'
import { CHANGES_TABLE, naturalUid, syncMiddleware, type SyncChange, type SyncMeta } from '../sync/changeLog'
import { getDeviceId, newUid, nextStamp } from '../sync/clock'

export type ProfilePhase = 'trying' | 'expecting'
export type BabySex = 'boy' | 'girl'

export interface BabyProfile extends SyncMeta {
  id?: number
  name: string
  birthDate: Date        // real or estimated due date (placeholder while trying)
  createdAt: Date
  phase?: ProfilePhase   // 'trying' = buscando embarazo; undefined = según birthDate
  sex?: BabySex          // para percentiles OMS
  lastPeriod?: Date      // FUR / última regla (modo buscando)
  cycleLength?: number   // días (modo buscando)
  region?: string        // comunidad autónoma (código de data/regions.ts)
  medical?: MedicalCard
}

/** Ficha médica básica para urgencias. */
export interface MedicalCard {
  bloodType?: string
  allergies?: string
  conditions?: string
  medications?: string
  pediatrician?: string
  pediatricianPhone?: string
  healthCenter?: string
  healthCenterPhone?: string
  hospital?: string
  notes?: string
}

export interface DiaryEntry extends SyncMeta {
  id?: number
  profileId: number
  date: Date
  week: number
  text: string
  milestone: boolean
}

export interface GrowthRecord extends SyncMeta {
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
  role?: ParentRole      // quién usa este dispositivo
  nightMode?: 'auto' | 'on' | 'off'
}

export type ParentRole = 'papa' | 'mama'

export interface FutureLetter extends SyncMeta {
  id?: number
  profileId: number
  date: Date
  week: number           // negative = prenatal, 0+ = postnatal
  pregnancyWeek?: number // set when week < 0: 40 + week
  title?: string
  body: string
  locked: boolean
}

export interface EntryPhoto extends SyncMeta {
  id?: number
  diaryEntryId: number
  dataUrl: string  // compressed JPEG base64
}

export type CareType = 'breast' | 'bottle' | 'diaper' | 'sleep' | 'med' | 'pump'

export interface CareLog extends SyncMeta {
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

export interface Appointment extends SyncMeta {
  id?: number
  profileId: number
  date: Date
  title: string
  kind: 'eco' | 'pediatra' | 'matrona' | 'vacuna' | 'analitica' | 'otro'
  notes?: string
  done: boolean
}

export interface CheckState extends SyncMeta {
  key: string        // `${profileId}|${listId}|${itemId}`
  profileId: number
  done: boolean
  date?: Date        // cuándo se marcó (hitos, primeros alimentos)
  note?: string      // p. ej. reacción a un alimento
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
  syncChanges!: Dexie.Table<SyncChange, [string, string]>

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
    // v5: sincronización entre dispositivos. Cada fila compartida lleva uid,
    // updatedAt y updatedBy; syncChanges guarda lo pendiente de subir.
    this.version(5).stores({
      profiles: '++id,name,uid',
      diaryEntries: '++id,profileId,date,week,milestone,uid',
      growthRecords: '[profileId+week],date,uid',
      appConfig: 'id',
      futureLetters: '++id,profileId,date,week,uid',
      entryPhotos: '++id,diaryEntryId,uid',
      careLogs: '++id,profileId,start,type,uid',
      appointments: '++id,profileId,date,uid',
      checks: 'key,profileId,uid',
      [CHANGES_TABLE]: '[tbl+uid],at',
    }).upgrade(async tx => {
      const at = nextStamp()
      const by = getDeviceId()
      const profileUid = new Map<number, string>()
      await tx.table('profiles').toCollection().modify((p: BabyProfile) => {
        p.uid ??= newUid()
        p.updatedAt = at
        p.updatedBy = by
        profileUid.set(p.id!, p.uid)
      })
      for (const t of ['diaryEntries', 'futureLetters', 'entryPhotos', 'careLogs', 'appointments']) {
        await tx.table(t).toCollection().modify((r: SyncMeta) => {
          r.uid ??= newUid()
          r.updatedAt = at
          r.updatedBy = by
        })
      }
      for (const t of ['growthRecords', 'checks'] as const) {
        await tx.table(t).toCollection().modify((r: SyncMeta & { profileId: number }) => {
          r.uid = naturalUid(t, r as unknown as Record<string, unknown>, profileUid.get(r.profileId) ?? `p${r.profileId}`)
          r.updatedAt = at
          r.updatedBy = by
        })
      }
    })
    this.use(syncMiddleware)
  }
}

export const db = new TatusDB()
