import { useLiveQuery } from 'dexie-react-hooks'
import { db, type BabyProfile } from '../db/db'
import { calculateWeek } from '../utils/calculateWeek'

interface ProfileResult {
  profile: BabyProfile | null
  currentWeek: number
}

export function useCurrentProfile(): { profile: BabyProfile | null; currentWeek: number; isLoading: boolean } {
  // Single useLiveQuery that reads config + profile atomically.
  // This eliminates the race condition where two chained useLiveQuery calls
  // could produce isLoading=false + profile=null before data resolves,
  // triggering a false redirect to onboarding.
  const result = useLiveQuery<ProfileResult>(async () => {
    const configs = await db.appConfig.toArray()
    if (configs.length === 0) {
      return { profile: null, currentWeek: -1 }
    }
    const activeId = configs[0].activeProfileId
    const profiles = await db.profiles.where('id').equals(activeId).toArray()
    const profile = profiles[0] ?? null
    const currentWeek = profile ? calculateWeek(profile.birthDate) : -1
    return { profile, currentWeek }
  }, [])

  return {
    profile: result?.profile ?? null,
    currentWeek: result?.currentWeek ?? -1,
    isLoading: result === undefined,
  }
}
