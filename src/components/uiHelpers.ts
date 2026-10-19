export const inputCls =
  'w-full bg-leche border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-tinta-500'

export const primaryBtn =
  'w-full bg-tinta-600 text-white rounded-xl py-3 text-sm font-semibold disabled:opacity-40 active:bg-tinta-700'

export function toInputDate(d: Date): string {
  const x = new Date(d)
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
}

export function fromInputDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatLongDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

export function formatShortDate(d: Date): string {
  return new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
