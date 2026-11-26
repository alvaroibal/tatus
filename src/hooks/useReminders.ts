import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { useCurrentProfile } from './useCurrentProfile'
import { useAppConfig } from './useAppConfig'
import { FEED_WATCH_DAYS, feedStatus } from '../utils/feeding'
import { medOwnerLabel, medStatus } from '../utils/momMeds'
import { notifyOnce, pruneSent, setBadge } from '../utils/notify'
import { daysBetween, formatTime } from '../utils/age'

const TICK_MS = 60_000

/** Vigila tomas y medicación y lanza avisos del sistema. Va montado en AppLayout. */
export function useReminders() {
  const { profile } = useCurrentProfile()
  const config = useAppConfig()
  const [now, setNow] = useState(() => new Date())
  const pid = profile?.id

  useEffect(() => {
    pruneSent()
    const t = setInterval(() => setNow(new Date()), TICK_MS)
    const onVisible = () => { if (document.visibilityState === 'visible') setNow(new Date()) }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const data = useLiveQuery(async () => {
    if (!pid) return null
    const [logs, plans, doses] = await Promise.all([
      db.careLogs.where('profileId').equals(pid).toArray(),
      db.medPlans.where('profileId').equals(pid).toArray(),
      db.medDoses.where('profileId').equals(pid).toArray(),
    ])
    return { logs, plans, doses }
  }, [pid])

  useEffect(() => {
    if (!profile || !data) return
    let pending = 0
    const name = profile.name

    const born = profile.phase !== 'trying' && +new Date(profile.birthDate) <= +now
    if (born && daysBetween(profile.birthDate, now) <= FEED_WATCH_DAYS) {
      const f = feedStatus(data.logs, now)
      const uid = f.last?.uid ?? String(f.last?.id)
      if (f.level === 'due') {
        pending++
        void notifyOnce(`feed-due-${uid}`, `🍼 Toca toma de ${name}`, `Han pasado 3 h desde la última (a las ${formatTime(f.last!.start)}).`)
      } else if (f.level === 'late') {
        pending++
        void notifyOnce(`feed-late-${uid}`, `⚠️ ${name} lleva más de 4 h sin comer`, 'Despiértalo y dale de comer. Si no quiere o está muy dormido, consulta.')
      }
    }

    const { who } = medOwnerLabel(config?.role, config?.partnerName)
    for (const plan of data.plans) {
      const s = medStatus(plan, data.doses, now)
      if (s.level !== 'due' && s.level !== 'late') continue
      pending++
      void notifyOnce(`med-${plan.uid}-${+s.nextDue!}`, `💊 ${plan.name}`, `${who === 'Tú' ? 'Te toca' : `Le toca a ${who}`} la toma de las ${formatTime(s.nextDue!)}.`)
    }
    setBadge(pending)
  }, [profile, data, now, config?.role, config?.partnerName])
}
