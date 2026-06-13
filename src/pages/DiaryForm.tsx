import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db } from '../db/db'
import { showToast } from '../utils/toast'

export default function DiaryForm() {
  const navigate = useNavigate()
  const { profile, currentWeek, isLoading } = useCurrentProfile()
  const [text, setText] = useState('')
  const [milestone, setMilestone] = useState(false)
  const [saving, setSaving] = useState(false)

  if (isLoading || !profile) return null

  async function handleSave() {
    if (!text.trim() || !profile?.id) return
    setSaving(true)
    try {
      await db.diaryEntries.add({
        profileId: profile.id!,
        date: new Date(),
        week: currentWeek,
        text: text.trim(),
        milestone,
      })
      navigate('/diario', { replace: true })
      showToast('Entrada guardada')
    } catch {
      showToast('Error al guardar — tu almacenamiento puede estar lleno. Ve a Ajustes para exportar un backup.')
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen pb-20">
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          onClick={() => navigate('/diario')}
          className="text-blue-600 text-sm font-medium"
        >
          ← Cancelar
        </button>
        <p className="text-xs text-gray-400">Semana {currentWeek} · {profile.name}</p>
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="text-blue-600 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      <div className="flex-1 px-5">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="¿Qué pasó hoy?"
          autoFocus
          className="w-full h-64 text-base text-gray-900 placeholder-gray-300 resize-none focus:outline-none bg-transparent leading-relaxed"
        />
      </div>

      <div className="px-5 pb-6">
        <button
          onClick={() => setMilestone(v => !v)}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-2xl transition-colors ${
            milestone
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className={milestone ? 'text-yellow-400' : 'text-gray-300'}>★</span>
          {milestone ? 'Marcado como hito' : 'Marcar como hito'}
        </button>
      </div>
    </div>
  )
}
