import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db, type FutureLetter } from '../db/db'
import { showToast } from '../utils/toast'

function weekLabel(week: number, pregnancyWeek?: number): string {
  if (week < 0 && pregnancyWeek != null) return `Semana ${pregnancyWeek} de embarazo`
  return `Semana ${week} de vida`
}

function todayLong(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function LetterForm() {
  const navigate = useNavigate()
  const { id } = useParams<{ id?: string }>()
  const isNew = !id || id === 'nueva'
  const { profile, currentWeek } = useCurrentProfile()

  const [letter, setLetter] = useState<FutureLetter | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(!isNew)
  const bodyRef = useRef<HTMLTextAreaElement>(null)

  const pregnancyWeek = currentWeek < 0 ? Math.max(1, 40 + currentWeek) : undefined

  useEffect(() => {
    if (isNew) {
      setBody(`Querido ${profile?.name ?? ''},\n\n`)
      setTimeout(() => {
        const el = bodyRef.current
        if (el) { el.focus(); el.selectionStart = el.selectionEnd = el.value.length }
      }, 100)
      return
    }
    db.futureLetters.get(Number(id)).then(found => {
      if (found) {
        setLetter(found)
        setTitle(found.title ?? '')
        setBody(found.body)
      }
      setLoading(false)
    })
  }, [id, isNew, profile?.name])

  if (loading || !profile) return null

  const isLocked = letter?.locked ?? false

  async function handleSave() {
    if (!body.trim() || !profile?.id) return
    setSaving(true)
    try {
      if (isNew) {
        await db.futureLetters.add({
          profileId: profile.id!,
          date: new Date(),
          week: currentWeek,
          pregnancyWeek,
          title: title.trim() || undefined,
          body: body.trim(),
          locked: false,
        })
        showToast('Carta guardada.')
      } else if (letter?.id) {
        await db.futureLetters.update(letter.id, {
          title: title.trim() || undefined,
          body: body.trim(),
        })
        showToast('Carta actualizada.')
      }
      navigate('/cartas')
    } catch {
      showToast('Error al guardar la carta.')
    } finally {
      setSaving(false)
    }
  }

  async function handleLock() {
    if (!letter?.id) return
    if (!confirm('¿Sellar esta carta? No podrás editarla después.')) return
    try {
      await db.futureLetters.update(letter.id, { locked: true })
      showToast('Carta sellada.')
      navigate('/cartas')
    } catch {
      showToast('Error al sellar la carta.')
    }
  }

  async function handleDelete() {
    if (!letter?.id) return
    if (!confirm('¿Borrar esta carta permanentemente?')) return
    try {
      await db.futureLetters.delete(letter.id)
      navigate('/cartas')
    } catch {
      showToast('Error al borrar.')
    }
  }

  const contextWeek = letter
    ? weekLabel(letter.week, letter.pregnancyWeek)
    : weekLabel(currentWeek, pregnancyWeek)

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-3 border-b border-gray-100">
        <button onClick={() => navigate('/cartas')} className="text-gray-400 text-sm">
          Cancelar
        </button>
        <div className="text-center">
          <p className="text-xs font-semibold text-blue-600">{contextWeek}</p>
          <p className="text-xs text-gray-400 capitalize">{todayLong()}</p>
        </div>
        {isLocked ? (
          <span className="text-sm text-gray-300">🔒</span>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving || !body.trim()}
            className="text-blue-600 text-sm font-semibold disabled:opacity-40"
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col px-5 pt-5 pb-6 space-y-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Título (opcional)"
          disabled={isLocked}
          className="text-lg font-semibold text-gray-800 placeholder-gray-300 border-none outline-none bg-transparent disabled:opacity-60"
        />

        <textarea
          ref={bodyRef}
          value={body}
          onChange={e => setBody(e.target.value)}
          disabled={isLocked}
          placeholder={`Querido ${profile.name},\n\n`}
          className="flex-1 text-base text-gray-800 leading-relaxed placeholder-gray-300 border-none outline-none resize-none bg-transparent disabled:opacity-70"
          rows={18}
        />
      </div>

      {/* Footer actions — only for existing unlocked letters */}
      {!isNew && !isLocked && (
        <div className="px-5 pb-10 flex items-center justify-between border-t border-gray-50 pt-4">
          <button onClick={handleDelete} className="text-sm text-red-400">
            Borrar
          </button>
          <button
            onClick={handleLock}
            className="text-sm text-gray-400 flex items-center gap-1.5"
          >
            <span>Sellar carta</span>
            <span>🔒</span>
          </button>
        </div>
      )}

      {isLocked && (
        <div className="px-5 pb-10 pt-4 text-center">
          <p className="text-xs text-gray-300">Esta carta está sellada y no se puede editar.</p>
        </div>
      )}
    </div>
  )
}
