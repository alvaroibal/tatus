import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/router'
import { ErrorBoundary } from './components/ErrorBoundary'
import { OverlayHost } from './components/OverlayHost'
import { initInstall } from './utils/install'
import { db } from './db/db'
import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource/atkinson-hyperlegible/latin-400.css'
import '@fontsource/atkinson-hyperlegible/latin-ext-400.css'
import '@fontsource/atkinson-hyperlegible/latin-700.css'
import '@fontsource/atkinson-hyperlegible/latin-ext-700.css'
import '@fontsource-variable/literata/wght.css'
import '@fontsource-variable/literata/wght-italic.css'
import './index.css'

async function idbAvailable(): Promise<boolean> {
  try {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.open('tatus-idb-check')
      req.onerror = () => reject(req.error)
      req.onsuccess = () => {
        req.result.close()
        indexedDB.deleteDatabase('tatus-idb-check')
        resolve()
      }
    })
    return true
  } catch {
    return false
  }
}

// Si tras un deploy falla la descarga de una pantalla (hash antiguo), recarga una vez.
window.addEventListener('vite:preloadError', event => {
  try {
    if (sessionStorage.getItem('tatus-reloaded')) return
    sessionStorage.setItem('tatus-reloaded', '1')
  } catch { return }
  event.preventDefault()
  location.reload()
})

// Sincronización: el runner (y con él la cripto y supabase-js) solo se descarga si
// hay servidor configurado y este móvil la tiene activada.
function startSyncIfEnabled() {
  if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) return
  db.syncState.get('self')
    .then(state => state?.enabled ? import('./sync/runner').then(m => m.startSync()) : undefined)
    .catch(() => { /* sin IndexedDB o sin red para el chunk: la app sigue igual y se reintenta al reabrir */ })
}

const root = document.getElementById('root')!

if (!(await idbAvailable())) {
  root.innerHTML = `
    <div style="padding:2rem;font-family:system-ui;text-align:center;max-width:400px;margin:4rem auto">
      <h2 style="margin-bottom:1rem">Tatuś necesita acceso a almacenamiento</h2>
      <p>Si estás en modo de navegación privada, ábrelo en Safari normal e instálalo desde ahí.</p>
    </div>
  `
} else {
  initInstall()
  startSyncIfEnabled()
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <RouterProvider router={router} />
        <OverlayHost />
      </ErrorBoundary>
    </StrictMode>
  )
}
