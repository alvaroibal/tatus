import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db, type DiaryEntry } from '../db/db'
import { compressImage } from '../utils/compressImage'
import { showToast } from '../utils/toast'

const MAX_PHOTOS = 5

type PhotoSlot = { id: number | null; dataUrl: string }

export default function DiaryForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isNew = !id
  const { profile, currentWeek, isLoading } = useCurrentProfile()

  const [entry, setEntry] = useState<DiaryEntry | null>(null)
  const [text, setText] = useState('')
  const [milestone, setMilestone] = useState(false)
  const [photos, setPhotos] = useState<PhotoSlot[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isNew) return
    Promise.all([
      db.diaryEntries.get(Number(id)),
      db.entryPhotos.where('diaryEntryId').equals(Number(id)).toArray(),
    ]).then(([found, foundPhotos]) => {
      if (found) {
        setEntry(found)
        setText(found.text)
        setMilestone(found.milestone)
        setPhotos(foundPhotos.map(p => ({ id: p.id ?? null, dataUrl: p.dataUrl })))
      }
      setLoading(false)
    })
  }, [id, isNew])

  if (isLoading || loading || !profile) return null

  const week = entry?.week ?? currentWeek
  const label = week < 0
    ? `Semana ${Math.max(1, 40 + week)} de embarazo`
    : `Semana ${week} · ${profile.name}`

  async function handlePickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (photos.length >= MAX_PHOTOS) {
      showToast(`Máximo ${MAX_PHOTOS} fotos por entrada.`)
      return
    }
    try {
      const dataUrl = await compressImage(file)
      setPhotos(prev => [...prev, { id: null, dataUrl }])
    } catch {
      showToast('No se pudo procesar la foto.')
    }
    e.target.value = ''
  }

  function removePhoto(index: number) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    if (!text.trim() || !profile?.id) return
    setSaving(true)
    try {
      await db.transaction('rw', [db.diaryEntries, db.entryPhotos], async () => {
        let entryId: number

        if (isNew) {
          entryId = Number(await db.diaryEntries.add({
            profileId: profile.id!,
            date: new Date(),
            week: currentWeek,
            text: text.trim(),
            milestone,
          }))
        } else {
          entryId = Number(id)
          await db.diaryEntries.update(entryId, { text: text.trim(), milestone })
          await db.entryPhotos.where('diaryEntryId').equals(entryId).delete()
        }

        for (const photo of photos) {
          await db.entryPhotos.add({ diaryEntryId: entryId, dataUrl: photo.dataUrl })
        }
      })

      navigate('/diario', { replace: true })
      showToast(isNew ? 'Entrada guardada' : 'Entrada actualizada')
    } catch {
      showToast('Error al guardar — puede que el almacenamiento esté lleno.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!id || !confirm('¿Borrar esta entrada permanentemente?')) return
    try {
      await db.transaction('rw', [db.diaryEntries, db.entryPhotos], async () => {
        await db.diaryEntries.delete(Number(id))
        await db.entryPhotos.where('diaryEntryId').equals(Number(id)).delete()
      })
      navigate('/diario', { replace: true })
    } catch {
      showToast('Error al borrar.')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 border-b border-gray-100">
        <button onClick={() => navigate('/diario')} className="text-gray-400 text-sm">
          Cancelar
        </button>
        <p className="text-xs text-gray-400">{label}</p>
        <button
          onClick={handleSave}
          disabled={saving || !text.trim()}
          className="text-blue-600 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>

      {/* Photo strip */}
      {(photos.length > 0 || photos.length < MAX_PHOTOS) && (
        <div className="flex gap-2 px-5 pt-4 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <div key={i} className="relative shrink-0">
              <img
                src={photo.dataUrl}
                alt=""
                className="w-20 h-20 object-cover rounded-xl"
              />
              <button
                onClick={() => removePhoto(i)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 text-white rounded-full text-xs flex items-center justify-center leading-none"
                aria-label="Eliminar foto"
              >
                ×
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <button
              onClick={() => fileRef.current?.click()}
              className="shrink-0 w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-300 gap-1"
              aria-label="Añadir foto"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              <span className="text-[10px]">Foto</span>
            </button>
          )}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handlePickPhoto}
        className="hidden"
      />

      {/* Text area */}
      <div className="flex-1 px-5 pt-4">
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="¿Qué pasó hoy?"
          autoFocus={isNew}
          className="w-full h-56 text-base text-gray-900 placeholder-gray-300 resize-none focus:outline-none bg-transparent leading-relaxed"
        />
      </div>

      {/* Bottom actions */}
      <div className="px-5 pb-8 flex items-center justify-between">
        <button
          onClick={() => setMilestone(v => !v)}
          className={`flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-2xl transition-colors ${
            milestone
              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          <span className={milestone ? 'text-yellow-400' : 'text-gray-300'}>★</span>
          {milestone ? 'Hito marcado' : 'Marcar hito'}
        </button>

        {!isNew && (
          <button onClick={handleDelete} className="text-sm text-red-400">
            Borrar
          </button>
        )}
      </div>
    </div>
  )
}
