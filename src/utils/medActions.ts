import { db, type MedPlan } from '../db/db'
import { tooEarly, type MedStatus } from './momMeds'
import { confirmDialog, toast } from './overlay'
import { formatTime } from './age'

/** Apunta una toma (con aviso si es demasiado pronto) y ofrece deshacer. */
export async function logMedDose(plan: MedPlan, status: MedStatus, at = new Date()): Promise<boolean> {
  if (!plan.uid || !plan.id) return false
  if (tooEarly(status, at)) {
    const ok = await confirmDialog({
      title: '¿Seguro que toca ya?',
      message: `La última de ${plan.name} fue a las ${formatTime(status.last!)} y la pauta es cada ${plan.everyHours} h.`,
      confirmLabel: 'Apuntarla igualmente',
    })
    if (!ok) return false
  }
  try {
    const id = await db.medDoses.add({ profileId: plan.profileId, planUid: plan.uid, takenAt: at })
    toast(`${plan.name}: toma de las ${formatTime(at)} apuntada`, { label: 'Deshacer', run: async () => { await db.medDoses.delete(id) } })
    return true
  } catch {
    toast('No se ha podido guardar. Vuelve a intentarlo.')
    return false
  }
}
