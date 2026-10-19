import { useNavigate } from 'react-router-dom'

export function BackHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="px-5 pt-10 pb-4">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => navigate(-1)} className="text-sm text-tinta-600 -ml-1 py-1 pr-3">
          ‹ Atrás
        </button>
        {right}
      </div>
      <h1 className="text-2xl font-bold text-gray-900 leading-tight">{title}</h1>
      {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
    </div>
  )
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">{children}</p>
  )
}

export function Disclaimer({ children }: { children?: React.ReactNode }) {
  return (
    <p className="px-5 text-xs text-gray-400 text-center leading-relaxed mt-6">
      {children ?? 'Información orientativa. No sustituye a tu matrona ni a tu pediatra.'}
    </p>
  )
}

export function AlertBox({ children, tone = 'red' }: { children: React.ReactNode; tone?: 'red' | 'amber' | 'blue' }) {
  const cls = {
    red: 'bg-red-50 border-red-100 text-red-800',
    amber: 'bg-amber-50 border-amber-100 text-amber-800',
    blue: 'bg-tinta-50 border-tinta-100 text-tinta-800',
  }[tone]
  return <div className={`border rounded-2xl p-4 text-sm leading-relaxed ${cls}`}>{children}</div>
}

export function LinkRow({ emoji, title, subtitle, onClick, badge }: {
  emoji: string
  title: string
  subtitle?: string
  onClick: () => void
  badge?: string
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-3 text-left active:bg-gray-50"
    >
      <span className="text-2xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          {badge && <span className="text-[10px] bg-tinta-600 text-white px-1.5 py-0.5 rounded-full">{badge}</span>}
        </div>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <span className="text-gray-300">›</span>
    </button>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`wordmark ${className}`} aria-label="Tatuś" role="img">
      tatu<span className="s">s</span>
    </span>
  )
}
