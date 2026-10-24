import { useSyncExternalStore } from 'react'
import { dismissToast, getOverlay, subscribeOverlay } from '../utils/overlay'

export function OverlayHost() {
  const { toast, dialog } = useSyncExternalStore(subscribeOverlay, getOverlay)

  return (
    <>
      {toast && (
        <div
          key={toast.id}
          role="status"
          className="fixed left-1/2 -translate-x-1/2 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60] w-[calc(100vw-2rem)] max-w-md bg-tinta-600 text-white rounded-2xl pl-4 pr-2 py-2 flex items-center gap-3 shadow-lg"
        >
          <p className="flex-1 text-sm py-1.5">{toast.message}</p>
          {toast.action && (
            <button
              onClick={async () => { const a = toast.action!; dismissToast(); await a.run() }}
              className="text-sm font-semibold text-yema px-3 py-2 rounded-xl active:bg-tinta-500"
            >
              {toast.action.label}
            </button>
          )}
        </div>
      )}

      {dialog && (
        <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
          <button aria-label="Cerrar" className="absolute inset-0 bg-tinta-900/40" onClick={() => dialog.resolve(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">{dialog.title}</h2>
            {dialog.message && <p className="text-sm text-gray-600 mt-2 leading-relaxed">{dialog.message}</p>}
            <div className="flex flex-col gap-2 mt-5">
              <button
                autoFocus
                onClick={() => dialog.resolve(true)}
                className={`w-full rounded-2xl py-3.5 text-base font-semibold text-white ${dialog.danger ? 'bg-red-600 active:bg-red-700' : 'bg-tinta-600 active:bg-tinta-700'}`}
              >
                {dialog.confirmLabel}
              </button>
              <button onClick={() => dialog.resolve(false)} className="w-full rounded-2xl py-3.5 text-base font-medium text-gray-600 active:bg-gray-100">
                {dialog.cancelLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
