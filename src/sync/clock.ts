// Identidad de dispositivo y reloj para la sincronización.
// El reloj es un "hybrid logical clock" mínimo: nunca retrocede y avanza por
// encima de cualquier marca remota vista, así un móvil con la hora atrasada no
// pierde siempre contra el otro.

const DEVICE_KEY = 'tatus-device-id'

export function newUid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

let deviceId: string | undefined

export function getDeviceId(): string {
  if (deviceId) return deviceId
  try {
    deviceId = localStorage.getItem(DEVICE_KEY) ?? undefined
    if (!deviceId) {
      deviceId = newUid()
      localStorage.setItem(DEVICE_KEY, deviceId)
    }
  } catch {
    deviceId = newUid()
  }
  return deviceId
}

let last = 0

/** Marca de tiempo estrictamente creciente para cambios locales (ms). */
export function nextStamp(now: number = Date.now()): number {
  last = Math.max(now, last + 1)
  return last
}

/** Registrar una marca remota para que los cambios locales siguientes la superen. */
export function observeStamp(remote: number): void {
  if (remote > last) last = remote
}

/** Solo para tests. */
export function resetClock(value = 0): void {
  last = value
}
