/** Iconos de línea propios (24×24, trazo redondeado) para no depender de emojis. */

const P = {
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const ICONS = {
  home: <path d="M3 11.5 12 4l9 7.5M5.5 9.8V20h4.5v-5.5h4V20h4.5V9.8" />,
  grid: <><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" /><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" /><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" /></>,
  bulb: <path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2v.5h5V16c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3Z" />,
  heart: <path d="M12 20s-8-4.8-8-10.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.6C20 15.2 12 20 12 20Z" />,
  book: <path d="M12 6.5C10.3 5.2 8 4.5 4 4.5v14c4 0 6.3.7 8 2 1.7-1.3 4-2 8-2v-14c-4 0-6.3.7-8 2Zm0 0v14" />,
  envelope: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3.5 6.5 8.5 6 8.5-6" /></>,
  calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>,
  chart: <path d="M4 19h16M5 15l4.5-4.5 3.5 3.5L19 8M15 8h4v4" />,
  syringe: <path d="m17 3 4 4M19 5l-3 3M16 8l-9.5 9.5H4v-2.5L13.5 5.5M11 8l2 2M8.5 10.5l2 2M5.5 18.5 3 21" />,
  pill: <g transform="rotate(-45 12 12)"><rect x="3.5" y="8.25" width="17" height="7.5" rx="3.75" /><path d="M12 8.25v7.5" /></g>,
  stethoscope: <><path d="M6 3.5H5v5.5a4 4 0 0 0 8 0V3.5h-1M9 13v1.5a5 5 0 0 0 10 0V12" /><circle cx="19" cy="10" r="2" /></>,
  checklist: <path d="M10 6.5h10M10 12h10M10 17.5h10M3.8 6.5l1.2 1.2 2.2-2.4M3.8 12l1.2 1.2 2.2-2.4M3.8 17.5l1.2 1.2 2.2-2.4" />,
  timer: <><circle cx="12" cy="13.5" r="7.5" /><path d="M12 10v3.5l2.5 1.5M10 2.5h4M12 2.5V6" /></>,
  move: <><path d="M7 21c-1.5-2-2-4.5-1-7 .8-2 3-2.5 4-1 1.2 1.7 0 4.5-.8 8" /><circle cx="14" cy="5" r="1.4" /><circle cx="17.5" cy="7.3" r="1.2" /><circle cx="19.3" cy="10.8" r="1" /><path d="M14 11.5c2.5-.5 5 1 4.5 4s-3.5 4.5-6 4" /></>,
  bottle: <path d="M9 3h6M10 3v2.5L8 9v11a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V9l-2-3.5V3M8 13h8M8 17h8" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  phone: <path d="M5 3.5h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 6.6 6.6l1.4-2.3 4.5 1.8V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2Z" />,
  siren: <><path d="M6 18v-5a6 6 0 0 1 12 0v5M4 21h16M12 3v1.5M4.2 6.2l1 1M19.8 6.2l-1 1" /><path d="M10 13a2 2 0 0 1 2-2" /></>,
  shield: <><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8 7.5 9.5 4.3-1.5 7.5-4.9 7.5-9.5V6L12 3Z" /><path d="M12 9v6M9 12h6" /></>,
  star: <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8L12 3.5Z" />,
  sparkles: <path d="M10 3.5 11.6 8 16 9.5l-4.4 1.6L10 15.5 8.4 11 4 9.5 8.4 8 10 3.5ZM18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" />,
  utensils: <path d="M7 3v18M4.5 3v5a2.5 2.5 0 0 0 5 0V3M17.5 21V3c-2.2 0-3.5 2.5-3.5 6s1.3 4.5 3.5 4.5" />,
  sprout: <path d="M12 21v-9M12 12c0-4.2-3-6.5-7.5-6.5 0 4.2 3 6.5 7.5 6.5ZM12 12c0-3.2 2.3-5.5 6.5-5.5 0 3.2-2.3 5.5-6.5 5.5" />,
  document: <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM14 3v5h5M9 13h6M9 17h6" />,
  bell: <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5ZM10 21h4" />,
  cog: <><circle cx="12" cy="12" r="3" /><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" /><circle cx="12" cy="12" r="6.6" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  back: <path d="m15 5-7 7 7 7" />,
  baby: <><circle cx="12" cy="10" r="6.5" /><path d="M9.5 10h.01M14.5 10h.01M10 13c1.2.9 2.8.9 4 0M12 3.5c-1.5 0-2 1.5-1 2.3M7 19.5c1.4.9 3.1 1.5 5 1.5s3.6-.6 5-1.5" /></>,
  drop: <path d="M12 3.5S6 10 6 14a6 6 0 0 0 12 0c0-4-6-10.5-6-10.5Z" />,
  diaper: <path d="M3.5 7h17v3.5a8.5 8.5 0 0 1-17 0V7ZM8 7l1.5 6M16 7l-1.5 6" />,
  bed: <path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3h-7v3M6.5 11.5h.01" />,
  pump: <><path d="M8 10a4 4 0 0 1 8 0v1H8v-1ZM10 11v3l-1 2v4.5h6V16l-1-2v-3" /></>,
  download: <path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14" />,
  undo: <path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />,
  edit: <path d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />,
  repeat: <path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" />,
  map: <path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21ZM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />,
  money: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6.5 9.5h.01M17.5 14.5h.01" /></>,
  child: <><circle cx="12" cy="5" r="2.2" /><path d="M8 21v-6.5L6 10.5l3-2h6l3 2-2 4V21M12 15v6" /></>,
  install: <><rect x="6" y="2.5" width="12" height="19" rx="2.5" /><path d="M12 7v7M9 11l3 3 3-3M10.5 18.5h3" /></>,
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, className = 'w-5 h-5', strokeWidth = 1.75 }: {
  name: IconName
  className?: string
  strokeWidth?: number
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} strokeWidth={strokeWidth} aria-hidden="true" {...P}>
      {ICONS[name]}
    </svg>
  )
}

/** Icono dentro de una pastilla de color, para listas y accesos rápidos. */
export function IconBadge({ name, tone = 'tinta', size = 'md' }: {
  name: IconName
  tone?: 'tinta' | 'yema' | 'rose' | 'red' | 'green'
  size?: 'sm' | 'md' | 'lg'
}) {
  const tones = {
    tinta: 'bg-tinta-50 text-tinta-600',
    yema: 'bg-yema-50 text-yema-700',
    rose: 'bg-rose-50 text-rose-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-700',
  }
  const sizes = { sm: 'w-8 h-8 rounded-xl', md: 'w-10 h-10 rounded-2xl', lg: 'w-12 h-12 rounded-2xl' }
  const icon = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' }
  return (
    <span className={`${sizes[size]} ${tones[tone]} flex items-center justify-center shrink-0`}>
      <Icon name={name} className={icon[size]} />
    </span>
  )
}
