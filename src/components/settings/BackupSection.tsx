import { useEffect, useRef, useState } from 'react'
import { exportVerifiedBackup, importBackup } from '../../utils/importBackup'
import { formatBackupDate, markBackupDone } from '../../utils/backupStatus'
import { getPersistState, requestPersistentStorage, type PersistState } from '../../utils/persistStorage'
import { useBackupStatus } from '../../hooks/useBackupStatus'
import { showToast } from '../../utils/toast'
import { confirmDialog } from '../../utils/overlay'

function downloadJson(json: string) {
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `tatus-backup-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const PERSIST_TEXT: Record<PersistState, string> = {
  persisted: 'El navegador ha aceptado no borrar los datos de Tatuś.',
  'not-persisted': 'El navegador aún puede borrar los datos si le falta espacio. Instalar la app y hacer copias lo evita.',
  unsupported: 'Este navegador no permite proteger los datos: haz copias a menudo.',
}

/** Copia de seguridad: exportar (verificada), importar y estado de protección del almacenamiento. */
export function BackupSection() {
  const status = useBackupStatus()
  const [importing, setImporting] = useState(false)
  const [persist, setPersist] = useState<PersistState | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    getPersistState().then(s => { if (alive) setPersist(s) })
    return () => { alive = false }
  }, [])

  async function handleExport() {
    try {
      const backup = await exportVerifiedBackup()
      if (!backup.ok) {
        showToast('La copia no ha salido bien. Vuelve a intentarlo.')
        return
      }
      downloadJson(backup.json)
      await markBackupDone(backup.items)
      showToast('Copia guardada')
      setPersist(await requestPersistentStorage())
    } catch {
      showToast('No se ha podido exportar el backup. Vuelve a intentarlo.')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!await confirmDialog({
      title: '¿Importar este backup?',
      message: 'Reemplazará todos los datos que hay ahora en este móvil.',
      confirmLabel: 'Importar y reemplazar',
      danger: true,
    })) {
      e.target.value = ''
      return
    }
    setImporting(true)
    const ok = await importBackup(await file.text())
    if (ok) showToast('Backup importado correctamente')
    setImporting(false)
    e.target.value = ''
  }

  const lastLabel = status?.lastBackupAt
    ? `Última copia: ${formatBackupDate(status.lastBackupAt)}`
    : 'Aún no has hecho ninguna copia'

  return (
    <section className="px-5 mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">Copia de seguridad</p>
      <div className="space-y-2">
        <button
          onClick={handleExport}
          className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-left"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">Exportar backup</p>
            <p className={`text-xs mt-0.5 ${status?.due ? 'text-amber-800 font-medium' : 'text-gray-500'}`}>{lastLabel}</p>
          </div>
          <span className="text-gray-500 text-lg" aria-hidden="true">↓</span>
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between text-left disabled:opacity-50"
        >
          <div>
            <p className="text-sm font-medium text-gray-900">
              {importing ? 'Importando…' : 'Importar backup'}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Reemplaza todos los datos con un backup previo</p>
          </div>
          <span className="text-gray-500 text-lg" aria-hidden="true">↑</span>
        </button>
        <input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
      </div>
      {persist && (
        <p className="text-xs text-gray-500 leading-relaxed mt-3">{PERSIST_TEXT[persist]}</p>
      )}
    </section>
  )
}
