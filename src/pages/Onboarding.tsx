import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { showToast } from '../utils/toast'

export default function Onboarding() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !birthDate) return
    setSaving(true)
    try {
      const [year, month, day] = birthDate.split('-').map(Number)
      const birthDateObj = new Date(year, month - 1, day)
      const profileId = await db.profiles.add({
        name: name.trim(),
        birthDate: birthDateObj,
        createdAt: new Date(),
      })
      await db.appConfig.put({ id: 1, activeProfileId: profileId as number })
      navigate('/')
    } catch {
      showToast('Error al guardar — tu almacenamiento puede estar lleno.')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Bienvenido, papá</h1>
        <p className="text-gray-500 mb-8">Vamos a configurar Tatuś.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del bebé
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="ej. Marco"
              required
              autoFocus
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              Si aún no ha nacido, pon la fecha estimada.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim() || !birthDate}
            className="w-full bg-blue-600 text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-40 active:bg-blue-700"
          >
            {saving ? 'Guardando…' : 'Empezar'}
          </button>
        </form>
      </div>
    </div>
  )
}
