/**
 * Avisos del sistema mientras la app está abierta o en segundo plano.
 * No hay servidor de notificaciones push: con el móvil bloqueado y la app
 * cerrada no sonarán. Para eso está la exportación al calendario.
 */

const SENT_PREFIX = 'tatus_notified_'
const SENT_TTL_MS = 3 * 24 * 3_600_000

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported'
}

export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

function alreadySent(key: string): boolean {
  try {
    return localStorage.getItem(SENT_PREFIX + key) !== null
  } catch {
    return false
  }
}

function markSent(key: string) {
  try {
    localStorage.setItem(SENT_PREFIX + key, String(Date.now()))
  } catch { /* sin almacenamiento: puede repetirse, no es grave */ }
}

/** Limpia las marcas antiguas para no llenar localStorage. */
export function pruneSent(now = Date.now()) {
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i)
      if (!k?.startsWith(SENT_PREFIX)) continue
      if (now - Number(localStorage.getItem(k)) > SENT_TTL_MS) localStorage.removeItem(k)
    }
  } catch { /* nada */ }
}

/** Muestra un aviso una sola vez por `key`. Devuelve si se ha mostrado. */
export async function notifyOnce(key: string, title: string, body: string): Promise<boolean> {
  if (notificationPermission() !== 'granted' || alreadySent(key)) return false
  markSent(key)
  const options: NotificationOptions = { body, tag: key, icon: `${import.meta.env.BASE_URL}pwa-192x192.png` }
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    if (reg) {
      await reg.showNotification(title, options)
      return true
    }
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}

/** Número en el icono de la app (donde el sistema lo permita). */
export function setBadge(count: number) {
  const nav = navigator as Navigator & { setAppBadge?: (n: number) => Promise<void>; clearAppBadge?: () => Promise<void> }
  try {
    if (count > 0) void nav.setAppBadge?.(count)
    else void nav.clearAppBadge?.()
  } catch { /* no soportado */ }
}
