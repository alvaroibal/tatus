import { useLiveQuery } from 'dexie-react-hooks'
import { db, type AppConfig } from '../db/db'

export function useAppConfig(): AppConfig | undefined {
  return useLiveQuery(async () => (await db.appConfig.toArray())[0], [])
}

/** "Natalia" o "tu pareja" si no se ha configurado. */
export function partnerLabel(config: AppConfig | undefined): string {
  return config?.partnerName?.trim() || 'tu pareja'
}

/** Sustituye {pareja} en el contenido. */
export function withPartner(text: string, partner: string): string {
  return text.replace(/\{pareja\}/g, partner)
}
