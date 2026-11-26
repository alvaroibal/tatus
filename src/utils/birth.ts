import { db, type BabyProfile, type BabySex, type BirthRecord } from '../db/db'
import { setCheck } from '../hooks/useChecks'
import { NEWBORN_LIST_ID } from '../data/newborn'
import { VACCINES, VACCINE_LIST_ID, vaccineId } from './vaccines'

export const BIRTH_VACCINES = VACCINES.filter(v => v.ageInDays === 0)

export interface BirthInput {
  name: string
  sex?: BabySex
  bloodType?: string
  record: BirthRecord
  /** id de tarea del recién nacido → hecha y resultado */
  tests: Record<string, { done: boolean; note?: string }>
  /** vaccineId → puesta */
  vaccines: Record<string, boolean>
}

export interface BirthValidation {
  ok: boolean
  error?: string
}

const MAX_FUTURE_MS = 5 * 60_000

/** Rangos amplios: solo frena errores de tecleo (3,4 en vez de 3400 g…). */
export function validateBirth(input: BirthInput, now = new Date()): BirthValidation {
  const { record } = input
  if (!input.name.trim()) return { ok: false, error: 'Escribe su nombre.' }
  if (Number.isNaN(+new Date(record.at))) return { ok: false, error: 'Indica la fecha y la hora del nacimiento.' }
  if (+new Date(record.at) > +now + MAX_FUTURE_MS) return { ok: false, error: 'La hora de nacimiento no puede ser futura.' }
  if (record.weightG !== undefined && (record.weightG < 300 || record.weightG > 7000)) return { ok: false, error: 'El peso va en gramos (por ejemplo 3420).' }
  if (record.lengthCm !== undefined && (record.lengthCm < 25 || record.lengthCm > 65)) return { ok: false, error: 'Revisa la talla (en cm, por ejemplo 50).' }
  if (record.headCm !== undefined && (record.headCm < 20 || record.headCm > 45)) return { ok: false, error: 'Revisa el perímetro de la cabeza (en cm, por ejemplo 34,5).' }
  if (record.gestationWeeks !== undefined && (record.gestationWeeks < 22 || record.gestationWeeks > 44)) return { ok: false, error: 'Revisa las semanas de gestación.' }
  for (const a of [record.apgar1, record.apgar5]) {
    if (a !== undefined && (a < 0 || a > 10 || !Number.isInteger(a))) return { ok: false, error: 'El Apgar va de 0 a 10.' }
  }
  return { ok: true }
}

function weightLabel(g: number): string {
  return `${g.toLocaleString('es-ES')} g`
}

export function birthSummary(name: string, r: BirthRecord): string {
  const when = new Date(r.at).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const bits = [r.weightG && weightLabel(r.weightG), r.lengthCm && `${r.lengthCm.toLocaleString('es-ES')} cm`].filter(Boolean)
  return `¡Ha nacido ${name}! ${when}${bits.length ? ` · ${bits.join(' · ')}` : ''}${r.hospital ? ` · ${r.hospital}` : ''}`
}

/**
 * Guarda el nacimiento: fecha y hora reales en el perfil, medidas en
 * crecimiento (semana 0), pruebas y vacunas como checks y, la primera vez,
 * una entrada en el diario.
 */
export async function saveBirth(profile: BabyProfile, input: BirthInput): Promise<void> {
  const pid = profile.id!
  const { record } = input
  const at = new Date(record.at)
  const firstTime = !profile.birth
  const medical = {
    ...profile.medical,
    ...(input.bloodType ? { bloodType: input.bloodType } : {}),
    ...(record.hospital && !profile.medical?.hospital ? { hospital: record.hospital } : {}),
  }

  await db.transaction('rw', [db.profiles, db.growthRecords, db.checks, db.diaryEntries], async () => {
    await db.profiles.update(pid, {
      name: input.name.trim(),
      birthDate: at,
      phase: undefined,
      sex: input.sex ?? profile.sex,
      birth: { ...record, at },
      medical,
    })

    if (record.weightG || record.lengthCm || record.headCm) {
      const prev = await db.growthRecords.get([pid, 0])
      await db.growthRecords.put({
        ...prev,
        profileId: pid,
        week: 0,
        date: at,
        weightKg: record.weightG ? record.weightG / 1000 : prev?.weightKg,
        heightCm: record.lengthCm ?? prev?.heightCm,
        headCm: record.headCm ?? prev?.headCm,
      })
    }

    for (const [id, t] of Object.entries(input.tests)) {
      await setCheck(pid, NEWBORN_LIST_ID, id, t.done, t.note ? { note: t.note } : {})
    }
    for (const [id, done] of Object.entries(input.vaccines)) {
      await setCheck(pid, VACCINE_LIST_ID, id, done, done ? { date: at } : {})
    }

    if (firstTime) {
      await db.diaryEntries.add({ profileId: pid, date: at, week: 0, text: birthSummary(input.name.trim(), record), milestone: true })
    }
  })
}

export { vaccineId }
