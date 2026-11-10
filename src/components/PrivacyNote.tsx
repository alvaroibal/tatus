// Promesa de privacidad de Tatuś. Tiene que ser verdad siempre: la segunda frase
// solo aparece cuando la sincronización existe en este build.

const SYNC_BUILD = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)

export const PRIVACY_BASE = 'Sin cuenta. Sin anuncios. Tus datos viven en tu móvil.'
export const PRIVACY_SYNC = 'Si activas la sincronización, viajan cifrados y nadie más puede leerlos.'

interface Props {
  className?: string
}

export function PrivacyNote({ className = '' }: Props) {
  return (
    <p className={`text-xs text-gray-500 leading-relaxed ${className}`}>
      {PRIVACY_BASE}{SYNC_BUILD && <> {PRIVACY_SYNC}</>}
    </p>
  )
}
