# Tatuś — contexto para agentes

PWA de paternidad local-first. Lee `README.md` para el qué y
`docs/designs/tatus-pwa.md` para la visión y el alcance decidido.

## Excepción al Golden Path de Forge (decisión deliberada)

Este proyecto **no** usa Next.js ni Supabase como base de datos y **no debe
migrarse**. La visión es un archivo que siga funcionando en 2044 sin depender de
ningún servidor ni empresa:

- Vite + React 19 + TypeScript, Tailwind **4**, Dexie (IndexedDB), PWA estática en GitHub Pages.
- Cualquier backend futuro (p. ej. sincronización) debe ser opcional y con
  cifrado de extremo a extremo: el servidor nunca ve contenido en claro.
- El export HTML/JSON es sagrado: no romper `schemaVersion` ni el import de backups antiguos.

## Reglas de código

- Antes de dar algo por terminado: `npx tsc -b && npm run lint && npm test`.
- Nada de `setState` síncrono dentro de `useEffect` (la regla
  `react-hooks/set-state-in-effect` está activa): deriva el valor en render o
  haz el `setState` en el callback asíncrono.
- Cambios de esquema en `src/db/db.ts`: nueva `version()` de Dexie con migración
  y test con `fake-indexeddb`. Las tablas sincronizables van en `SYNC_TABLES`.
- Textos de la app en español (tuteo). Contenido de salud siempre con fuente en
  `src/data/sources.ts`.
- Archivos de componentes < 500 líneas (`CareLog.tsx` y `Settings.tsx` ya están cerca: partir antes de crecer).
- Rutas y `start_url` cuelgan de `/tatus/`.

## Pendiente conocido

- Transporte de sincronización (`src/sync/` solo tiene la parte local).
- CI (tsc + lint + test en cada push).
- Bundle inicial grande (Recharts y `data/guides.ts`).
