import type { Appointment } from '../db/db'

export interface SuggestedCheckup {
  id: string
  title: string
  kind: Appointment['kind']
  /** Días respecto a la fecha (probable) de nacimiento. Negativo = embarazo. */
  offsetDays: number
}

const pw = (week: number) => (week - 40) * 7   // semana de embarazo → días respecto a FPP
const m = (months: number) => Math.round(months * 30.44)

export const SUGGESTED_CHECKUPS: SuggestedCheckup[] = [
  { id: 'p-matrona', title: 'Primera visita con la matrona', kind: 'matrona', offsetDays: pw(8) },
  { id: 'p-eco1', title: 'Ecografía 1.er trimestre + cribado', kind: 'eco', offsetDays: pw(12) },
  { id: 'p-eco2', title: 'Ecografía morfológica', kind: 'eco', offsetDays: pw(20) },
  { id: 'p-osullivan', title: "Test de O'Sullivan", kind: 'analitica', offsetDays: pw(25) },
  { id: 'p-dtpa', title: 'Vacuna tosferina (dTpa)', kind: 'vacuna', offsetDays: pw(28) },
  { id: 'p-eco3', title: 'Ecografía 3.er trimestre', kind: 'eco', offsetDays: pw(34) },
  { id: 'p-sgb', title: 'Exudado estreptococo B', kind: 'analitica', offsetDays: pw(36) },
  { id: 'p-monitores', title: 'Monitores semana 40', kind: 'matrona', offsetDays: pw(40) },
  { id: 'b-d4', title: 'Primera visita pediatra y matrona', kind: 'pediatra', offsetDays: 4 },
  { id: 'b-d15', title: 'Revisión 15 días', kind: 'pediatra', offsetDays: 15 },
  { id: 'b-m1', title: 'Revisión 1 mes', kind: 'pediatra', offsetDays: m(1) },
  { id: 'b-m2', title: 'Revisión + vacunas 2 meses', kind: 'pediatra', offsetDays: m(2) },
  { id: 'b-m4', title: 'Revisión + vacunas 4 meses', kind: 'pediatra', offsetDays: m(4) },
  { id: 'b-m6', title: 'Revisión 6 meses', kind: 'pediatra', offsetDays: m(6) },
  { id: 'b-m9', title: 'Revisión 9 meses', kind: 'pediatra', offsetDays: m(9) },
  { id: 'b-m11', title: 'Vacunas 11 meses', kind: 'vacuna', offsetDays: m(11) },
  { id: 'b-m12', title: 'Revisión + vacunas 12 meses', kind: 'pediatra', offsetDays: m(12) },
  { id: 'b-m15', title: 'Revisión + vacunas 15 meses', kind: 'pediatra', offsetDays: m(15) },
  { id: 'b-m18', title: 'Revisión 18 meses', kind: 'pediatra', offsetDays: m(18) },
  { id: 'b-m24', title: 'Revisión 2 años', kind: 'pediatra', offsetDays: m(24) },
  { id: 'b-y3', title: 'Revisión 3-4 años + vacunas', kind: 'pediatra', offsetDays: m(36) },
]

export const KIND_LABELS: Record<Appointment['kind'], { label: string; emoji: string }> = {
  eco: { label: 'Ecografía', emoji: '🖥️' },
  pediatra: { label: 'Pediatra', emoji: '🩺' },
  matrona: { label: 'Matrona', emoji: '🤰' },
  vacuna: { label: 'Vacuna', emoji: '💉' },
  analitica: { label: 'Analítica', emoji: '🧪' },
  otro: { label: 'Otro', emoji: '📌' },
}
