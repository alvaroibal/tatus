# Tatuś

PWA personal de paternidad: guía semana a semana desde la búsqueda del embarazo
hasta los 5 años, y a la vez un archivo para el hijo (diario, fotos, hitos,
crecimiento y cartas para leer a los 18 años).

**Sin cuenta, sin servidor, sin rastreo.** Todo vive en el navegador (IndexedDB)
y funciona offline. El archivo se puede exportar como HTML autónomo que no
depende de ninguna empresa.

## Qué incluye

| Área | Pantallas |
|------|-----------|
| Inicio | Etapa de la semana (física, mental, emocional + tareas del padre), modo prenatal 1–40, modo búsqueda |
| Archivo | Diario con fotos e hitos, timeline, cartas del futuro, año en review, share card |
| Salud | Vacunas (calendario 2026), crecimiento con percentiles OMS, ficha médica, urgencias |
| Herramientas | Registro de cuidados, dosis de antitérmicos, contracciones, patadas, fecha de parto, fertilidad, citas, checklists, hitos del desarrollo, alimentos, resumen para el pediatra |
| Guía | Artículos con fuentes oficiales (AEP, AEPap, AESAN, OMS, AEMPS, Sanidad…) |
| Ajustes | Multi-perfil, backup JSON (export/import), instalación, versión |

## Stack

- Vite 8 + React 19 + TypeScript + React Router 7
- Tailwind CSS 4 (`@tailwindcss/vite`)
- Dexie 4 (IndexedDB) + `dexie-react-hooks`
- Recharts (curvas de crecimiento)
- `vite-plugin-pwa` (Workbox, `autoUpdate`)
- Vitest + jsdom + `fake-indexeddb`

## Estructura

```
src/
├── pages/         # Pantallas (tools/ y guides/ agrupan subsecciones)
├── components/    # UI compartida (layout, nav, tarjetas, overlays)
├── hooks/         # useCurrentProfile, useAppConfig, useChecks
├── db/db.ts       # Esquema Dexie y migraciones de versión
├── sync/          # Motor local de sincronización (changelog, reloj, merge) — sin transporte todavía
├── data/          # Contenido: etapas, vacunas, guías, hitos, tablas OMS, fuentes
├── utils/         # Cálculos (semana, embarazo, dosis), export/import, ICS, share card
└── router/        # Rutas y páginas lazy
docs/
├── designs/       # Plan de producto (CEO plan)
└── brand/         # Manual de marca y logos
```

## Desarrollo

```bash
npm install
npm run dev        # servidor local en /tatus/
npm test           # tests unitarios (Vitest)
npm run lint
npm run build      # tsc -b + vite build
```

## Despliegue

Se publica en GitHub Pages bajo `/tatus/` (ver `base` en `vite.config.ts`).

Cada push a `main` pasa por el CI (`.github/workflows/ci.yml`): `npm audit` de
dependencias de producción, typecheck, lint, tests y build. Si todo pasa, se
publica solo en la rama `gh-pages`. Los pull requests ejecutan los checks sin
publicar.

Despliegue manual (por si el CI no está disponible):

```bash
npm run deploy     # build + gh-pages -d dist
```

## Contenido médico

Las guías, vacunas y la tabla de dosis citan su fuente en `src/data/sources.ts`.
Son información general, no sustituyen al pediatra. Al cambiar contenido de
salud, actualiza también la fuente correspondiente.
