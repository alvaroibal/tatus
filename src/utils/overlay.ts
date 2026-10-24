/**
 * Diálogos y avisos propios (en vez de confirm()/alert() del navegador).
 * Un pequeño almacén que pinta <OverlayHost />.
 */

export interface ToastState {
  id: number
  message: string
  action?: { label: string; run: () => void | Promise<void> }
}

export interface DialogState {
  title: string
  message?: string
  confirmLabel: string
  cancelLabel: string
  danger: boolean
  resolve: (ok: boolean) => void
}

interface State {
  toast: ToastState | null
  dialog: DialogState | null
}

let state: State = { toast: null, dialog: null }
const listeners = new Set<() => void>()
let toastTimer: ReturnType<typeof setTimeout> | undefined
let nextId = 1

function set(patch: Partial<State>) {
  state = { ...state, ...patch }
  listeners.forEach(l => l())
}

export function subscribeOverlay(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getOverlay(): State {
  return state
}

export function dismissToast() {
  clearTimeout(toastTimer)
  set({ toast: null })
}

export function toast(message: string, action?: ToastState['action'], ms = action ? 6000 : 3500) {
  clearTimeout(toastTimer)
  set({ toast: { id: nextId++, message, action } })
  toastTimer = setTimeout(() => set({ toast: null }), ms)
}

/** Sustituto de confirm(): devuelve una promesa con la respuesta. */
export function confirmDialog(opts: {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}): Promise<boolean> {
  return new Promise(resolve => {
    set({
      dialog: {
        title: opts.title,
        message: opts.message,
        confirmLabel: opts.confirmLabel ?? 'Aceptar',
        cancelLabel: opts.cancelLabel ?? 'Cancelar',
        danger: opts.danger ?? false,
        resolve: ok => {
          set({ dialog: null })
          resolve(ok)
        },
      },
    })
  })
}

/**
 * Borra al instante y ofrece "Deshacer" durante unos segundos.
 * `restore` debe volver a escribir lo borrado (normalmente un put de la fila leída antes).
 */
export async function deleteWithUndo(message: string, remove: () => Promise<unknown>, restore: () => Promise<unknown>) {
  await remove()
  toast(message, { label: 'Deshacer', run: async () => { await restore() } })
}
