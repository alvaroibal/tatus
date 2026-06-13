import { useRef, useState } from 'react'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db } from '../db/db'
import { showToast } from '../utils/toast'
import { exportBackup, importBackup } from '../utils/importBackup'
import { PageHeader } from '../components/PageHeader'

declare const __APP_VERSION__: string

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function Settings() {
  const { profile, isLoading } = useCurrentProfile()
  const [editingDate, setEditingDate] = useState(false)
  const [newDateStr, setNewDateStr] = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (isLoading || !profile) return null

  async function handleDateSave() {
    if (!newDateStr || !profile?.id) return
    const [year, month, day] = newDateStr.split('-').map(Number)
    try {
      await db.profiles.update(profile.id, { birthDate: new Date(year, month - 1, day) })
      showToast('Fecha actualizada')
      setEditingDate(false)
    } catch {
      showToast('Error al actualizar la fecha.')
    }
  }

  async function handleExport() {
    try {
      const json = await exportBackup()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tatus-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast('Backup exportado')
    } catch {
      showToast('Error al exportar.')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const hasData = (await db.profiles.count()) > 0
    if (hasData) {
      if (!confirm('Este import reemplazará todos tus datos actuales. ¿Continuar?')) {
        e.target.value = ''
        return
      }
    }

    setImporting(true)
    const text = await file.text()
    const ok = await importBackup(text)
    if (ok) showToast('Backup importado correctamente')
    setImporting(false)
    e.target.value = ''
  }

  const birthDateInput = profile.birthDate instanceof Date
    ? profile.birthDate.toISOString().slice(0, 10)
    : new Date(profile.birthDate).toISOString().slice(0, 10)

  return (
    <div className="pb-6">
      <PageHeader title="Ajustes" />

      {/* Profile */}
      <section className="px-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Perfil</p>
        <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Nombre</span>
            <span className="text-sm font-medium text-gray-900">{profile.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Fecha de nacimiento</span>
            {editingDate ? (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  defaultValue={birthDateInput}
                  onChange={e => setNewDateStr(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                />
                <button onClick={handleDateSave} className="text-blue-600 text-sm font-medium">OK</button>
                <button onClick={() => setEditingDate(false)} className="text-gray-400 text-sm">✕</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{formatDate(profile.birthDate)}</span>
                <button onClick={() => setEditingDate(true)} className="text-blue-600 text-xs">Editar</button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Backup */}
      <section className="px-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Backup</p>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full bg-gray-50 rounded-2xl p-4 text-left flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">Exportar backup</p>
              <p className="text-xs text-gray-400 mt-0.5">Descarga un archivo JSON con todos tus datos</p>
            </div>
            <span className="text-gray-300 text-lg">↓</span>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="w-full bg-gray-50 rounded-2xl p-4 text-left flex items-center justify-between disabled:opacity-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {importing ? 'Importando…' : 'Importar backup'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Reemplaza todos los datos con un backup previo</p>
            </div>
            <span className="text-gray-300 text-lg">↑</span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>
      </section>

      {/* iOS warning */}
      <section className="px-5 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            ⚠️ iOS puede borrar los datos de la app si no la abres durante más de 7 días.
            Exporta el diario regularmente con el botón de arriba.
          </p>
        </div>
      </section>

      {/* Footer */}
      <div className="px-5 text-center">
        <p className="text-xs text-gray-300">Tatuś — build {__APP_VERSION__}</p>
      </div>
    </div>
  )
}
