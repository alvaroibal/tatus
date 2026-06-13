import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BabyProfile } from '../db/db'
import { calculateWeek } from '../utils/calculateWeek'

export function useCurrentProfile(): { profile: BabyProfile | null; currentWeek: number; isLoading: boolean } {
  const config = useLiveQuery(() => db.appConfig.get(1))
  const profile = useLiveQuery(
    () =>
      config?.activeProfileId
        ? db.profiles.get(config.activeProfileId)
        : undefined,
    [config?.activeProfileId]
  )
  const isLoading = config === undefined
  const currentWeek = profile ? calculateWeek(profile.birthDate) : -1
  return { profile: profile ?? null, currentWeek, isLoading }
}
