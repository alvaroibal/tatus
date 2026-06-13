import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BabyProfile } from '../db/db'
import { calculateWeek } from '../utils/calculateWeek'

export function useCurrentProfile(): { profile: BabyProfile | null; currentWeek: number; isLoading: boolean } {
  // Use toArray() instead of get(1) so we can distinguish:
  //   undefined → still loading (useLiveQuery sentinel)
  //   []        → DB empty, no config yet
  //   [{...}]   → config exists
  const configArr = useLiveQuery(() => db.appConfig.toArray(), [])
  const activeId = configArr?.[0]?.activeProfileId

  const profileArr = useLiveQuery(
    () =>
      activeId !== undefined
        ? db.profiles.where('id').equals(activeId).toArray()
        : Promise.resolve([] as BabyProfile[]),
    [activeId]
  )

  const isLoading =
    configArr === undefined ||
    (activeId !== undefined && profileArr === undefined)

  const profile = profileArr?.[0] ?? null
  const currentWeek = profile ? calculateWeek(profile.birthDate) : -1

  return { profile, currentWeek, isLoading }
}
