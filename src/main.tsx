import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/router'
import { ErrorBoundary } from './components/ErrorBoundary'
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

const root = document.getElementById('root')!

if (!(await idbAvailable())) {
  root.innerHTML = `
    <div style="padding:2rem;font-family:system-ui;text-align:center;max-width:400px;margin:4rem auto">
      <h2 style="margin-bottom:1rem">Tatuś necesita acceso a almacenamiento</h2>
      <p>Si estás en modo de navegación privada, ábrelo en Safari normal e instálalo desde ahí.</p>
    </div>
  `
} else {
  createRoot(root).render(
    <StrictMode>
      <ErrorBoundary>
        <RouterProvider router={router} />
      </ErrorBoundary>
    </StrictMode>
  )
}
