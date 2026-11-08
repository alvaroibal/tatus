# La Pieza: Tatuś Sync

> **Estado**: PENDIENTE
> **Blueprint origen**: `BLUEPRINT-tatus-sync.md` (aprobado 2026-11-07)
> **Fecha**: 2026-11-07
> **Build Mode**: Feature en app existente (excepción al Golden Path — ver `CLAUDE.md`)

---

## Objetivo

Dos móviles de la misma familia comparten el archivo de Tatuś (texto y fotos) a través de
Supabase, cifrado de extremo a extremo, y una frase de 12 palabras recupera todo en un
móvil nuevo. Sin activarla, la app funciona exactamente igual que hoy.

## Por Qué

| Problema del Usuario                                                               | Cómo lo Resuelve                                    |
| ---------------------------------------------------------------------------------- | --------------------------------------------------- |
| Si se pierde el móvil o iOS borra el almacenamiento, se pierde el archivo del hijo | Copia continua cifrada + frase de rescate           |
| Solo un padre puede apuntar                                                        | Mismo archivo en los dos móviles, sincronizado solo |
| Subir datos de salud de un menor a un servidor                                     | El servidor solo ve bloques cifrados con ids opacos |

**Impacto medible**: cero pérdidas de datos en una semana de uso real con dos móviles; cambio visible en el otro móvil en ≤ 10 s.

## Qué

### Criterios de Éxito (Definition of Done)

- [ ] Un navegador vacío con la frase recupera perfiles, diario, fotos, cartas, crecimiento, registros, citas y checks con conteos idénticos.
- [ ] Cambio en A visible en B en ≤ 10 s (B abierta) o en la siguiente apertura.
- [ ] 100 cambios offline se suben al volver la red, sin duplicados.
- [ ] Ediciones simultáneas convergen al mismo estado en los dos móviles.
- [ ] pgTAP: un no miembro no lee, escribe ni lista nada (tablas y Storage).
- [ ] JS inicial sin cambios de tamaño (sync, QR y Supabase cargan bajo demanda).
- [ ] Sin variables de Supabase, el build funciona y no muestra la sección.

### Happy Path

Padre A: Ajustes → Sincronizar → Activar → apunta 12 palabras → confirma 2 → se sube todo.
→ "Añadir el móvil de tu pareja" → QR. Pareja B instala Tatuś → Bienvenida → "Mi pareja
ya usa Tatuś" → escanea → descarga → Inicio con el mismo bebé. Desde ahí, lo que apunta
cada uno aparece en el otro.

---

## Contexto

### Referencias de Código

- `src/sync/engine.ts` → `collectOutgoing`, `ackOutgoing`, `queueEverything`, `applyRemote` (se reutilizan sin cambios de contrato)
- `src/sync/merge.ts` → `SyncRecord`, `planMerge` (LWW), codec fila ↔ registro
- `src/sync/changeLog.ts` → middleware Dexie; **no usar async/await dentro** (zona PSD)
- `src/sync/__tests__/engine.test.ts` → patrón de tests con `fake-indexeddb`
- `src/db/db.ts` → versiones Dexie 1-5; la 6 añade `syncState`
- `src/utils/importBackup.ts` → backup `schemaVersion` 5 (no cambia)
- `src/router/lazyPages.tsx` → pantallas nuevas con `lazy()`
- `BLUEPRINT-tatus-sync.md` → fuente de verdad (arquitectura, SQL, wireframes, seguridad)

### Arquitectura (adaptada a la estructura de Tatuś, no Feature-First de Next)

```
src/sync/   crypto.ts · keyStore.ts · transport.ts · memoryTransport.ts · runner.ts
src/pages/sync/   SyncSettings.tsx · SyncSetup.tsx · SyncLink.tsx
supabase/   migrations/20261107000000_sync.sql · tests/rls.sql
```

### Modelo de Datos

Ver _Esquema del servidor_ en el Blueprint: `spaces`, `space_members`, `sync_records`
(RLS en las tres), secuencia `sync_seq`, RPCs `create_space` / `join_space` /
`push_records` / `pull_records` / `delete_space`, bucket privado `sync-blobs`.

---

## Blueprint (Fases de Construcción)

> Las subtareas se generan al entrar en cada fase (El Yunque). Cada fase = 1 PR a `main`.

### Fase 1: Cripto y llave local

**Objetivo**: `crypto.ts` + `keyStore.ts` + Dexie v6 con tests; ninguna UI.
**Validación**: tests de ida y vuelta de frase, vector fijo, manipulación (AAD/IV) y migración v5→v6; CI verde.
**Tiempo estimado**: ~1 día

### Fase 2: Servidor Supabase

**Objetivo**: proyecto `tatus` (UE) con migración, RLS, RPCs, bucket y cuotas; variables en Actions.
**Validación**: pgTAP verde; `get_advisors` sin avisos de seguridad; build sin variables sigue funcionando.
**Tiempo estimado**: ~1 día

### Fase 3: Bucle de sincronización

**Objetivo**: `Transport` (Supabase lazy + memoria), `runner.ts` con disparadores, fotos por Storage, `useSyncStatus()`.
**Validación**: tests con dos BD + `MemoryTransport` (alta, conflicto, borrado, offline, recuperación); demo con dos perfiles de Chrome.
**Tiempo estimado**: ~1,5 días

### Fase 4: Pantallas de sincronización

**Objetivo**: activar + frase + confirmación, QR, escanear / escribir palabras, estado, texto RGPD; entrada desde Bienvenida.
**Validación**: flujo en iPhone (Safari instalada) y Android; Lighthouse a11y 100; JS inicial sin crecer.
**Tiempo estimado**: ~1,5 días

### Fase 5: Validación final

**Objetivo**: E2E Playwright con dos contextos + Supabase local en el CI, CSP, `/adversarial-review`, docs.
**Validación**:

- [ ] `npx tsc -b` → 0 errores · `npm run lint` · `npm test` · `npm run build`
- [ ] E2E y pgTAP verdes en el CI
- [ ] `get_advisors(type: "security")` sin avisos
- [ ] Todos los criterios de éxito cumplidos
- [ ] Una semana de uso real en dos móviles
      **Tiempo estimado**: ~1 día

_(Fase 6 — P1: realtime, desactivar, aviso de datos previos, rotar llave. Se planifica tras la Fase 5.)_

---

## 🔒 Auto-Blindaje

> Crece durante la implementación.

### 2026-11-08: npm sustituye el symlink de node_modules en el worktree

- **Error**: La Forja asume que `npm install <pkg>` en un sandbox con `node_modules` enlazado instala en el repo principal. En realidad npm (v11) borró el symlink de sandbox-1 y creó un `node_modules` propio (293 MB); el principal quedó sin el paquete.
- **Fix**: Sin daño (el principal no se tocó y sandbox-2 sigue con su symlink). Tras fusionar la Fase 1, ejecutar `npm ci` en el repo principal para que el resto de oleadas tenga las dependencias.
- **Aplicar en**: `forja/setup.sh` y prompts de oleadas siguientes: el sandbox que instale paquetes debe hacerlo con su propio `node_modules` (no symlink) o instalarlos el humano en el principal antes de lanzar. Corregir también la regla 20 de `.claude/skills/la-forja/SKILL.md` en Forge.

### 2026-11-08: Supabase local no arranca completo con Docker de 3,8 GB

- **Error**: `supabase_storage` no pasaba el health check con todos los servicios levantados.
- **Fix**: `supabase start -x studio,logflare,vector,edge-runtime,imgproxy,realtime,mailpit,postgres-meta`.
- **Aplicar en**: Fase 3 (pruebas contra Supabase local) y el job de CI de la Fase 5.

### 2026-11-08: segfault de Postgres local al probar "permission denied" en pgTAP

- **Error**: en la imagen `supabase/postgres:17.6.1.106`, llamar como `anon` a una función sin EXECUTE desde psql tumba el servidor (signal 11). Por PostgREST responde bien (401).
- **Fix**: en pgTAP se comprueba con `has_function_privilege`; el rechazo real se prueba por HTTP.
- **Aplicar en**: Fase 5 (reprobar con la CLI v3 y, si sigue, reportarlo a Supabase).

### 2026-11-08: push_records aceptaba cualquier blob_path y version_by sin límite

- **Error**: la revisión de la Fase 2 vio que un miembro podía apuntar `blob_path` a otra ruta y mandar `version_by` de longitud arbitraria.
- **Fix**: `blob_path` nulo o exactamente `{familia}/{rid}`; `version_by` ≤ 64 caracteres; 3 pruebas pgTAP.
- **Aplicar en**: Fase 3: el cliente también debe comprobar que el `blob_path` recibido es `{spaceId}/{rid}` antes de descargar.

### 2026-11-09: los tests de sync dependían del .env.local del desarrollador

- **Error**: el agente dejó un `.env.local` con Supabase local para la demo y 2 tests (sync "no disponible") fallaron en la revisión: Vitest carga las variables `VITE_*` de `.env.local`.
- **Fix**: `test.env` en `vite.config.ts` fija `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` vacías; los tests usan `MemoryTransport`.
- **Aplicar en**: cualquier test que dependa de variables de entorno: fijarlas en `test.env` o con `vi.stubEnv`, nunca heredarlas.

### 2026-11-09: carrera entre el blob de una foto y el LWW de push_records (riesgo aceptado)

- **Error**: `putBlob` sobrescribe `{familia}/{rid}` antes de que `push_records` decida por versión. Si dos móviles cambian la misma foto a la vez, el blob puede quedarse con la versión que perdió.
- **Fix**: pendiente. Las fotos se añaden o se borran, no se editan, así que es muy improbable. Solución prevista: ruta de blob con versión (`{familia}/{rid}/{version}`) aceptada por el servidor.
- **Aplicar en**: Fase 5 (o 6) junto con la cuota de Storage.

---

## Gotchas (Antes de Implementar)

- [ ] `main` está protegida: cada fase en rama + PR; el CI ("Typecheck, lint, tests y build") debe pasar antes de fusionar.
- [ ] Middleware de Dexie: encadenar con `.then`, nunca `async/await` (rompe la zona PSD y `liveQuery`).
- [ ] `applyRemote` marca la transacción como remota; si se escribe fuera de ella, los cambios se re-sellan y se re-suben en bucle.
- [ ] `entryPhotos.dataUrl` son JPEG base64 de ~200-400 KB: no meterlos en `sync_records.payload`, van a Storage.
- [ ] La seed no puede acabar en el backup JSON/HTML ni en `console`.
- [ ] Safari iOS no tiene `BarcodeDetector`: polyfill `barcode-detector` cargado solo al abrir la cámara.
- [ ] Llaves WebCrypto `extractable: false`; la seed se guarda en bruto en IndexedDB para poder volver a mostrar QR/frase.
- [ ] `pull_records` depende del bloqueo por familia en `push_records` para que el cursor `seq` no se salte filas.
- [ ] Verificar cada paquete npm (versión, fecha, dependencias) antes de instalar y fijar versión exacta.
- [ ] Supabase gratuito se pausa tras 7 días sin uso: el error de red debe mostrarse claro, no como "datos perdidos".

## Anti-Patrones

- ❌ Reescribir el motor de `src/sync/` existente: se extiende, no se sustituye
- ❌ Enviar al servidor cualquier campo en claro salvo `rid`, `version`, `version_by`, `size`
- ❌ Importar `@supabase/supabase-js`, `qrcode` o `barcode-detector` de forma estática
- ❌ Usar `any` (usar `unknown` + Zod al leer del servidor)
- ❌ Tablas sin RLS o RPCs sin comprobar pertenencia
- ❌ `setState` síncrono en `useEffect` (regla de lint activa)

---

_La Pieza pendiente de elegir modo de ejecución. Ninguna línea de código ha sido modificada._
