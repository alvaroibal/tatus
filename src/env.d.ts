/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  /** URL del proyecto Supabase para la sincronización (opcional: sin ella no hay sync). */
  readonly VITE_SUPABASE_URL?: string
  /** Clave pública (anon) de Supabase (opcional). */
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
