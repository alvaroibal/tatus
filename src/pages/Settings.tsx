import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { db, type BabyProfile } from '../db/db'
import { showToast } from '../utils/toast'
import { deleteProfileData, exportBackup, importBackup } from '../utils/importBackup'
import { useAppConfig } from '../hooks/useAppConfig'
import { toInputDate } from '../components/uiHelpers'
import { PageHeader } from '../components/PageHeader'

declare const __APP_VERSION__: string

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Debug panel ──────────────────────────────────────────────────────────────

function DebugPanel({ profile }: { profile: BabyProfile }) {
  const [storage, setStorage] = useState<{ used: number; quota: number } | null>(null)

  const counts = useLiveQuery(async () => ({
    profiles: await db.profiles.count(),
    diaryEntries: await db.diaryEntries.count(),
    growthRecords: await db.growthRecords.count(),
    futureLetters: await db.futureLetters.count(),
    entryPhotos: await db.entryPhotos.count(),
    careLogs: await db.careLogs.count(),
    appointments: await db.appointments.count(),
    checks: await db.checks.count(),
  }), [])

  async function fetchStorage() {
    try {
      const est = await navigator.storage.estimate()
      setStorage({ used: est.usage ?? 0, quota: est.quota ?? 0 })
    } catch {
      setStorage(null)
    }
  }

  function mb(bytes: number) { return (bytes / 1048576).toFixed(1) + ' MB' }

  return (
    <div className="mx-5 mb-6 bg-gray-900 rounded-2xl p-4 text-xs text-green-400 font-mono space-y-1">
      <p className="text-gray-500 mb-2">— debug panel —</p>
      <p>profile: {profile.name} (id={profile.id})</p>
      <p>birthDate: {toInputDate(profile.birthDate)} · phase: {profile.phase ?? '—'}</p>
      <p>build: {__APP_VERSION__}</p>
      {counts && <>
        <p>profiles: {counts.profiles}</p>
        <p>diaryEntries: {counts.diaryEntries}</p>
        <p>growthRecords: {counts.growthRecords}</p>
        <p>futureLetters: {counts.futureLetters}</p>
        <p>entryPhotos: {counts.entryPhotos}</p>
        <p>careLogs: {counts.careLogs}</p>
        <p>appointments: {counts.appointments}</p>
        <p>checks: {counts.checks}</p>
      </>}
      {storage
        ? <p>storage: {mb(storage.used)} / {mb(storage.quota)}</p>
        : <button onClick={fetchStorage} className="text-yema underline">medir storage</button>
      }
    </div>
  )
}

// ── Add profile form ─────────────────────────────────────────────────────────

function AddProfileForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim() || !birthDate) return
    setSaving(true)
    try {
      const [y, m, d] = birthDate.split('-').map(Number)
      const birthDateObj = new Date(y, m - 1, d)
      await db.transaction('rw', db.profiles, db.appConfig, async () => {
        const newId = Number(await db.profiles.add({
          name: name.trim(),
          birthDate: birthDateObj,
          createdAt: new Date(),
        }))
        await db.appConfig.update(1, { activeProfileId: newId })
      })
      showToast(`Perfil de ${name.trim()} creado.`)
      onDone()
    } catch {
      showToast('No se ha podido crear el perfil. Vuelve a intentarlo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-tinta-50 rounded-2xl p-4 space-y-3 mt-2">
      <p className="text-xs font-semibold text-tinta-600 uppercase tracking-widest">Nuevo bebé</p>
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Nombre"
        className="w-full border border-tinta-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tinta-400"
        autoFocus
      />
      <input
        type="date"
        value={birthDate}
        onChange={e => setBirthDate(e.target.value)}
        className="w-full border border-tinta-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-tinta-400"
      />
      <p className="text-xs text-tinta-400">Pon la fecha estimada si aún no ha nacido.</p>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !birthDate}
          className="flex-1 bg-tinta-600 text-white rounded-xl py-2 text-sm font-semibold disabled:opacity-40"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
        <button
          onClick={onDone}
          className="px-4 py-2 text-sm text-gray-400"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Family section ───────────────────────────────────────────────────────────

function FamilySection({ profile }: { profile: BabyProfile }) {
  const config = useAppConfig()
  const [partner, setPartner] = useState<string | null>(null)
  const [babyName, setBabyName] = useState<string | null>(null)
  const value = partner ?? config?.partnerName ?? ''

  async function saveName() {
    if (babyName === null || !babyName.trim()) return setBabyName(null)
    await db.profiles.update(profile.id!, { name: babyName.trim() })
    showToast('Nombre actualizado')
    setBabyName(null)
  }

  async function savePartner() {
    if (partner === null) return
    await db.appConfig.update(1, { partnerName: partner.trim() || undefined })
    showToast('Guardado')
    setPartner(null)
  }

  async function setSex(sex: BabyProfile['sex']) {
    await db.profiles.update(profile.id!, { sex })
  }

  async function setTrying(trying: boolean) {
    if (trying) {
      if (!confirm('¿Volver al modo "buscando bebé" para este perfil?')) return
      await db.profiles.update(profile.id!, { phase: 'trying' })
    } else {
      await db.profiles.update(profile.id!, { phase: 'expecting' })
    }
  }

  return (
    <section className="px-5 mb-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Familia</p>
      <div className="bg-white border border-gray-100 rounded-2xl p-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre del bebé</label>
          <input value={babyName ?? profile.name} onChange={e => setBabyName(e.target.value)} onBlur={saveName}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tinta-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Nombre de tu pareja</label>
          <div className="flex gap-2">
            <input value={value} onChange={e => setPartner(e.target.value)} onBlur={savePartner} placeholder="tu pareja"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-tinta-500" />
          </div>
          <p className="text-xs text-gray-400 mt-1">Se usa en los consejos del embarazo.</p>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Sexo de {profile.name} (para percentiles)</p>
          <div className="flex gap-2">
            {([['boy', 'Niño'], ['girl', 'Niña'], [undefined, 'Sin indicar']] as const).map(([k, l]) => (
              <button key={l} onClick={() => setSex(k)}
                className={`flex-1 text-xs rounded-xl py-2 border ${profile.sex === k ? 'bg-tinta-50 border-tinta-200 text-tinta-700 font-semibold' : 'border-gray-200 text-gray-500'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1">Etapa</p>
          {profile.phase === 'trying' ? (
            <button onClick={() => setTrying(false)} className="text-sm text-tinta-600">Ya estamos embarazados → usa la calculadora de fecha de parto</button>
          ) : new Date(profile.birthDate) > new Date() ? (
            <button onClick={() => setTrying(true)} className="text-sm text-gray-500">Volver a "buscando bebé"</button>
          ) : (
            <p className="text-sm text-gray-500">Nacido/a. Usa "Editar fecha" para corregir la fecha de nacimiento.</p>
          )}
        </div>
      </div>
    </section>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

export default function Settings() {
  const navigate = useNavigate()
  const { profile, isLoading } = useCurrentProfile()
  const [editingDate, setEditingDate] = useState(false)
  const [newDateStr, setNewDateStr] = useState('')
  const [importing, setImporting] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [tapCount, setTapCount] = useState(0)
  const [debugVisible, setDebugVisible] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const allProfiles = useLiveQuery(() => db.profiles.toArray(), [])
  const activeId = profile?.id

  if (isLoading || !profile) return null

  // ── Profile actions ──────────────────────────────────────────────────────

  async function handleSwitch(p: BabyProfile) {
    if (p.id === activeId) return
    try {
      await db.appConfig.update(1, { activeProfileId: p.id! })
    } catch {
      showToast('No se ha podido cambiar de perfil. Vuelve a intentarlo.')
    }
  }

  async function handleDeleteProfile(p: BabyProfile) {
    if ((allProfiles?.length ?? 0) <= 1) {
      showToast('No puedes borrar el único perfil.')
      return
    }
    if (!confirm(`¿Borrar el perfil de ${p.name}? Se borrarán también su diario, sus cartas y sus medidas, y no se podrán recuperar.`)) return
    try {
      await deleteProfileData(p.id!)
      if (p.id === activeId) {
        const remaining = (allProfiles ?? []).filter(x => x.id !== p.id)
        if (remaining.length) await db.appConfig.update(1, { activeProfileId: remaining[0].id! })
      }
      showToast(`Perfil de ${p.name} borrado.`)
    } catch {
      showToast('No se ha podido borrar el perfil. Vuelve a intentarlo.')
    }
  }

  // ── Date edit ───────────────────────────────────────────────────────────

  async function handleDateSave() {
    if (!newDateStr || !profile?.id) return
    const [y, m, d] = newDateStr.split('-').map(Number)
    try {
      const birthDate = new Date(y, m - 1, d)
      await db.profiles.update(profile.id, {
        birthDate,
        // Una fecha pasada significa que ya ha nacido
        phase: birthDate <= new Date() ? undefined : 'expecting',
      })
      showToast('Fecha actualizada')
      setEditingDate(false)
    } catch {
      showToast('No se ha podido cambiar la fecha. Vuelve a intentarlo.')
    }
  }

  // ── Backup ──────────────────────────────────────────────────────────────

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
      showToast('No se ha podido exportar el backup. Vuelve a intentarlo.')
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!confirm('Este import reemplazará todos tus datos actuales. ¿Continuar?')) {
      e.target.value = ''
      return
    }
    setImporting(true)
    const ok = await importBackup(await file.text())
    if (ok) showToast('Backup importado correctamente')
    setImporting(false)
    e.target.value = ''
  }

  // ── Debug tap ───────────────────────────────────────────────────────────

  function handleFooterTap() {
    const next = tapCount + 1
    setTapCount(next)
    if (next >= 10) setDebugVisible(true)
  }

  const birthDateInput = toInputDate(profile.birthDate)

  return (
    <div className="pb-6">
      <PageHeader title="Ajustes" />

      {/* Perfiles */}
      <section className="px-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Perfiles</p>
        <div className="space-y-2">
          {(allProfiles ?? []).map(p => (
            <div
              key={p.id}
              className={`flex items-center gap-3 rounded-2xl p-4 ${
                p.id === activeId ? 'bg-tinta-50 border border-tinta-100' : 'bg-white border border-gray-100'
              }`}
            >
              <button
                onClick={() => handleSwitch(p)}
                className="flex-1 text-left min-w-0"
              >
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-semibold ${p.id === activeId ? 'text-tinta-700' : 'text-gray-800'}`}>
                    {p.name}
                  </p>
                  {p.id === activeId && (
                    <span className="text-xs bg-tinta-600 text-white px-2 py-0.5 rounded-full">activo</span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{formatDate(p.birthDate)}</p>
              </button>
              {/* Edit birthDate — only active profile */}
              {p.id === activeId && !editingDate && (
                <button onClick={() => setEditingDate(true)} className="text-xs text-tinta-500 shrink-0">
                  Editar fecha
                </button>
              )}
              {/* Delete — not last profile */}
              {(allProfiles?.length ?? 0) > 1 && (
                <button onClick={() => handleDeleteProfile(p)} className="text-xs text-red-400 shrink-0">
                  Borrar
                </button>
              )}
            </div>
          ))}

          {/* Edit birthDate inline */}
          {editingDate && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-2">
              <input
                type="date"
                defaultValue={birthDateInput}
                onChange={e => setNewDateStr(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm flex-1"
              />
              <button onClick={handleDateSave} className="text-tinta-600 text-sm font-medium">OK</button>
              <button onClick={() => setEditingDate(false)} className="text-gray-400 text-sm">✕</button>
            </div>
          )}

          {showAddForm ? (
            <AddProfileForm onDone={() => setShowAddForm(false)} />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-3 text-sm text-tinta-600 font-medium rounded-2xl border-2 border-dashed border-tinta-100"
            >
              + Añadir bebé
            </button>
          )}
        </div>
      </section>

      {/* Familia */}
      <FamilySection profile={profile} />

      {/* Más */}
      <section className="px-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Más</p>
        <div className="space-y-2">
          {[
            { to: '/vacunas', title: 'Vacunas', sub: 'Calendario orientativo 2026' },
            { to: '/crecimiento', title: 'Crecimiento', sub: 'Peso, talla y percentiles OMS' },
            { to: '/herramientas/citas', title: 'Citas', sub: 'Ecografías, pediatra y revisiones' },
            { to: '/timeline', title: 'Hitos', sub: 'Línea de tiempo de momentos especiales' },
            { to: '/year-review', title: 'Año en review', sub: `Resumen de ${new Date().getFullYear()}` },
          ].map(l => (
            <button key={l.to} onClick={() => navigate(l.to)}
              className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between">
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900">{l.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{l.sub}</p>
              </div>
              <span className="text-gray-300">›</span>
            </button>
          ))}
        </div>
      </section>

      {/* Backup */}
      <section className="px-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Backup</p>
        <div className="space-y-2">
          <button
            onClick={handleExport}
            className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between"
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
            className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between disabled:opacity-50"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {importing ? 'Importando…' : 'Importar backup'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">Reemplaza todos los datos con un backup previo</p>
            </div>
            <span className="text-gray-300 text-lg">↑</span>
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImportFile} className="hidden" />
        </div>
      </section>

      {/* iOS warning */}
      <section className="px-5 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
          <p className="text-xs text-amber-800 leading-relaxed">
            ⚠️ iOS puede borrar los datos de la app si no la abres durante más de 7 días.
            Exporta el diario regularmente.
          </p>
        </div>
      </section>

      {/* Debug panel */}
      {debugVisible && <DebugPanel profile={profile} />}

      {/* Footer */}
      <button onClick={handleFooterTap} className="w-full px-5 text-center py-2">
        <p className="text-xs text-gray-300">Tatuś — build {__APP_VERSION__}</p>
      </button>
    </div>
  )
}
