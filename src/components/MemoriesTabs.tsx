import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/diario', label: 'Diario' },
  { to: '/cartas', label: 'Cartas' },
  { to: '/timeline', label: 'Primeras veces' },
]

/** Cabecera común de Recuerdos: Diario · Cartas · Primeras veces. */
export function MemoriesTabs({ right }: { right?: React.ReactNode }) {
  return (
    <div className="px-5 pt-12 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Recuerdos</h1>
        {right}
      </div>
      <div className="flex bg-gray-100 rounded-xl p-1">
        {TABS.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            replace
            className={({ isActive }) =>
              `flex-1 text-center text-sm py-2 rounded-lg transition-colors ${
                isActive ? 'bg-white shadow-sm font-semibold text-gray-900' : 'text-gray-500'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}
