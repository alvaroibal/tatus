/**
 * Instalación como app y almacenamiento persistente.
 * iOS borra los datos de una web que no se abre en 7 días salvo que esté instalada
 * en la pantalla de inicio; en Android, persist() protege los datos si falta espacio.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null
const listeners = new Set<() => void>()

export function initInstall() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferred = e as BeforeInstallPromptEvent
    listeners.forEach(l => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach(l => l())
  })
  // Pide al navegador que no borre IndexedDB por falta de espacio. Silencioso si no lo soporta.
  navigator.storage?.persist?.().catch(() => {})
}

export function subscribeInstall(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function canPromptInstall(): boolean {
  return deferred !== null
}

export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false
  await deferred.prompt()
  const { outcome } = await deferred.userChoice
  deferred = null
  listeners.forEach(l => l())
  return outcome === 'accepted'
}

export function isStandalone(): boolean {
  return window.matchMedia?.('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}
