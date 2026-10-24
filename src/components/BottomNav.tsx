import { NavLink, useLocation } from 'react-router-dom'
import { useCurrentProfile } from '../hooks/useCurrentProfile'
import { contextualTool } from '../data/tools'
import { Icon, type IconName } from './Icon'

const MEMORIES = ['/diario', '/cartas', '/timeline', '/year-review']

export function BottomNav() {
  const { profile, currentWeek } = useCurrentProfile()
  const { pathname } = useLocation()
  const ctx = contextualTool(profile?.phase, currentWeek)

  const items: { to: string; label: string; icon: IconName; end?: boolean; match?: (p: string) => boolean }[] = [
    { to: '/', label: 'Inicio', icon: 'home', end: true },
    { to: ctx.to, label: ctx.short, icon: ctx.icon },
    { to: '/herramientas', label: 'Útiles', icon: 'grid', match: p =>
      (p.startsWith('/herramientas') && !p.startsWith(ctx.to)) ||
      ['/vacunas', '/ficha'].includes(p) ||
      (p === '/crecimiento' && ctx.to !== '/crecimiento') },
    { to: '/guia', label: 'Guía', icon: 'bulb' },
    { to: '/diario', label: 'Recuerdos', icon: 'heart', match: p => MEMORIES.some(m => p.startsWith(m)) },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-10 pb-[env(safe-area-inset-bottom)] print:hidden">
      <div className="max-w-lg mx-auto flex">
        {items.map(({ to, label, icon, end, match }) => (
          <NavLink
            key={label}
            to={to}
            end={end}
            className={({ isActive }) => {
              const active = match ? match(pathname) : isActive
              return `flex-1 flex flex-col items-center justify-center pt-2 pb-1.5 min-h-[56px] gap-0.5 transition-colors ${
                active ? 'text-tinta-600' : 'text-gray-500'
              }`
            }}
          >
            {({ isActive }) => {
              const active = match ? match(pathname) : isActive
              return (
                <>
                  <Icon name={icon} className="w-6 h-6" strokeWidth={active ? 2.1 : 1.6} />
                  <span className={`text-[11px] ${active ? 'font-semibold' : 'font-medium'}`}>{label}</span>
                </>
              )
            }}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
