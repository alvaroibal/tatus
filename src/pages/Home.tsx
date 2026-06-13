import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { getStage } from '../utils/getStage'
import { StageCard } from '../components/StageCard'
import { SkeletonCard } from '../components/SkeletonCard'
import stagesData from '../data/stages.json'
import type { Stage } from '../utils/getStage'

const stages = stagesData as Stage[]

function lastSeenKey(profileId: number) {
  return `tatus_last_week_seen_${profileId}`
}

function getLastSeenWeek(profileId: number): number {
  return parseInt(localStorage.getItem(lastSeenKey(profileId)) ?? '-1', 10)
}

function BeforeBirth({ birthDate, childName }: { birthDate: Date; childName: string }) {
  const msUntil = new Date(birthDate).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)
  const daysUntil = Math.ceil(msUntil / 86_400_000)
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
      <p className="text-5xl mb-4">🌱</p>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Faltan {daysUntil} días para conocerte
      </h2>
      <p className="text-gray-500 text-sm">{childName}</p>
      <p className="text-gray-400 text-xs mt-6 leading-relaxed max-w-xs">
        El diario está disponible. Puedes escribir entradas antes del nacimiento.
      </p>
    </div>
  )
}

function NextWeekLocked({ unlockDate }: { unlockDate: Date }) {
  const fmt = unlockDate.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  return (
    <div className="mx-5 mb-6 border border-gray-100 rounded-2xl p-4 flex items-center gap-3 opacity-60">
      <div className="text-xl shrink-0">🔒</div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Próxima semana
        </p>
        <p className="text-sm text-gray-500 capitalize">Se desbloquea el {fmt}</p>
      </div>
    </div>
  )
}

export default function Home() {
  const navigate = useNavigate()
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    const lastSeen = getLastSeenWeek(profile.id)
    if (currentWeek > lastSeen) {
      setShowBadge(true)
      localStorage.setItem(lastSeenKey(profile.id), String(currentWeek))
    }
  }, [profile?.id, currentWeek])

  useEffect(() => {
    if (!isLoading && profile === null) {
      navigate('/onboarding', { replace: true })
    }
  }, [isLoading, profile, navigate])

  if (isLoading) return <SkeletonCard />
  if (profile === null) return null

  if (currentWeek < 0) {
    return <BeforeBirth birthDate={profile.birthDate} childName={profile.name} />
  }

  const stage = getStage(currentWeek, stages)
  const nextUnlockDate = new Date(
    new Date(profile.birthDate).setHours(0, 0, 0, 0) + (currentWeek + 1) * 7 * 86_400_000
  )

  return (
    <div>
      {showBadge && (
        <button
          onClick={() => setShowBadge(false)}
          className="w-full mx-0 mt-4 px-5"
        >
          <div className="bg-blue-600 text-white rounded-2xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-semibold">¡Nueva semana desbloqueada! 🎉</span>
            <span className="text-blue-300 text-sm">✕</span>
          </div>
        </button>
      )}
      <StageCard week={currentWeek} stage={stage} childName={profile.name} />
      <NextWeekLocked unlockDate={nextUnlockDate} />
    </div>
  )
}
