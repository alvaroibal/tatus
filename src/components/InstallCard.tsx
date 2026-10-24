import { useState, useSyncExternalStore } from 'react'
import { Icon } from './Icon'
import { canPromptInstall, isIOS, isStandalone, promptInstall, subscribeInstall } from '../utils/install'

const KEY = 'tatus_install_dismissed'

function wasDismissed(): boolean {
  try { return localStorage.getItem(KEY) === '1' } catch { return false }
}

/** Invita a instalar la app (protege los datos en iOS y la abre a pantalla completa). */
export function InstallCard({ force = false }: { force?: boolean }) {
  const promptable = useSyncExternalStore(subscribeInstall, canPromptInstall)
  const [dismissed, setDismissed] = useState(wasDismissed)

  if (isStandalone()) return null
  if (!force && dismissed) return null
  const ios = isIOS()
  if (!ios && !promptable) return null

  function dismiss() {
    try { localStorage.setItem(KEY, '1') } catch { /* sin almacenamiento */ }
    setDismissed(true)
  }

  return (
    <div className="mx-5 mb-4 bg-tinta-600 text-white rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <Icon name="install" className="w-6 h-6 shrink-0 text-yema mt-0.5" />
        <div className="flex-1">
          <p className="text-[15px] font-semibold">Instala Tatuś en tu móvil</p>
          <p className="text-sm text-tinta-100 mt-1 leading-relaxed">
            {ios
              ? 'Toca Compartir y luego "Añadir a pantalla de inicio". Así iOS no borra tus datos si pasas unos días sin abrirla.'
              : 'Se abre como una app, funciona sin conexión y tus datos quedan más protegidos.'}
          </p>
          <div className="flex gap-2 mt-3">
            {!ios && (
              <button onClick={() => promptInstall()} className="bg-yema text-tinta-900 rounded-xl px-4 py-2.5 text-sm font-semibold">
                Instalar
              </button>
            )}
            {!force && (
              <button onClick={dismiss} className="text-sm text-tinta-200 px-3 py-2.5">Ahora no</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
