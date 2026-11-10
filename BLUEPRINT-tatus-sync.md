# Tatuś Sync — Master Blueprint

> Sincronización entre dispositivos con cifrado de extremo a extremo.
> Generado con La Herrería (ruta corta: Tech Spec → User Stories → Security Audit → Blueprint)
> Fecha: 2026-11-07 · Estado: **PENDIENTE DE APROBACIÓN**

---

## Visión de la feature

Hoy el archivo de Tatuś vive en un único navegador. Si se pierde o se cambia el móvil,
o iOS borra el almacenamiento, el diario, las fotos y las cartas desaparecen salvo que
alguien haya exportado un backup a mano. Y los dos padres no pueden apuntar en el mismo
archivo.

**Tatuś Sync** hace tres cosas:

1. **Mismo archivo en los móviles de los dos padres**, sincronizado solo.
2. **Copia de seguridad continua**: si se pierden todos los móviles, una frase de 12
   palabras en papel recupera todo en un móvil nuevo.
3. **Sin romper la promesa de la app**: el servidor solo guarda bloques cifrados. Ni
   Supabase, ni quien lo administre, ni un atacante que lo comprometa puede leer
   nada. La sincronización es **opcional**: sin activarla, Tatuś funciona igual que hoy.

### Decisiones tomadas (2026-11-07)

| Decisión | Elección | Motivo |
|---|---|---|
| Servidor | **Supabase** (Postgres + Storage + Auth anónima) | Stack de Forge, capa gratuita, RLS, MCP disponible |
| Llave | **QR para vincular + frase de rescate de 12 palabras** | La llave nunca pasa por el servidor y existe recuperación si se pierden todos los móviles |
| Fotos | **Se sincronizan desde el principio** | Son lo más valioso del archivo |
| Proceso | **Ruta corta de La Herrería** | La app existe; la UI son 3-4 pantallas en Ajustes |

### Fuera de alcance (MVP)

- Compartir con más de una familia o con abuelos (lectura).
- Rotar la llave o expulsar un móvil perdido (queda como P1, Fase 6).
- Fusionar dos perfiles del mismo bebé creados por separado (se avisa; P1).
- Cualquier dato en claro en el servidor, analítica o cuentas con email.

---

## Stack técnico (referencia rápida)

Se mantiene la **excepción al Golden Path** documentada en `CLAUDE.md`.

| Capa | Tecnología | Nota |
|---|---|---|
| App | Vite 8 + React 19 + TS + Dexie 4 | Sin cambios |
| Motor local | `src/sync/` (changeLog, clock, merge, engine) | **Ya existe y tiene tests.** No se reescribe |
| Cripto | WebCrypto (AES-GCM 256, HKDF-SHA256, HMAC-SHA256) | Nativo: sin dependencias criptográficas propias |
| Frase de rescate | `@scure/bip39` 2.4.0 (lista en español) | Auditada, una dependencia (`@noble/hashes`) |
| QR (mostrar) | `qrcode` 1.5.4 | Genera el QR en un `<canvas>` |
| QR (escanear) | `barcode-detector` 3.2.3 (polyfill zxing-wasm) | Safari iOS no tiene `BarcodeDetector` nativo |
| Servidor | `@supabase/supabase-js` 2.119.x | **Se carga con `import()` solo si la sync está activada** |
| Hosting | GitHub Pages (sin cambios) | La app sigue siendo estática |

### Servicios externos y configuración

| Servicio | Qué | Dónde se configura |
|---|---|---|
| Supabase | Proyecto `tatus`, región UE (Frankfurt) | dashboard + migraciones en `supabase/migrations/` |
| `VITE_SUPABASE_URL` | URL del proyecto | GitHub → Settings → Variables (Actions) |
| `VITE_SUPABASE_ANON_KEY` | Clave publicable | GitHub → Settings → Variables (es pública por diseño; la seguridad está en RLS + cifrado) |

**Si las variables no existen, la sección de sincronización no aparece.** Así el build
local y los forks siguen funcionando sin servidor.

### Coste

Capa gratuita: 500 MB de base de datos y 1 GB de Storage. Con fotos de ~300 KB caben
~3.000 fotos. **Ojo:** Supabase pausa los proyectos gratuitos tras una semana sin
peticiones. Con uso diario no pasa; si pasa, los datos se conservan y se reactiva desde
el dashboard. Si el archivo crece, el plan Pro cuesta 25 $/mes.

### Estructura de carpetas (nuevo)

```
src/sync/
├── changeLog.ts, clock.ts, merge.ts, engine.ts   # existentes
├── crypto.ts          # NUEVO: seed, frase, HKDF, cifrar/descifrar registros
├── keyStore.ts        # NUEVO: tabla local syncState (seed, spaceId, cursor)
├── transport.ts       # NUEVO: interfaz Transport + implementación Supabase (lazy)
├── memoryTransport.ts # NUEVO: servidor en memoria para tests
├── runner.ts          # NUEVO: syncNow(), disparadores, reintentos, estado
└── __tests__/         # crypto, runner con dos BD fake, transport contract
src/pages/sync/
├── SyncSettings.tsx   # estado + activar/desactivar
├── SyncSetup.tsx      # crear familia + mostrar y confirmar frase
├── SyncLink.tsx       # mostrar QR (móvil A) / escanear o escribir palabras (móvil B)
supabase/
├── migrations/20261107000000_sync.sql
└── tests/rls.sql      # pruebas de RLS con pgTAP
```

---

## Arquitectura

```
 Móvil A                                   Supabase (solo ve bloques cifrados)        Móvil B
┌─────────────────────┐                   ┌──────────────────────────────┐   ┌──────────────────┐
│ Dexie (en claro)    │                   │ spaces       (id, auth_hash) │   │ Dexie (en claro) │
│  └ syncMiddleware   │──collectOutgoing─▶│ space_members(space, user)   │   │                  │
│     └ syncChanges   │  cifrar (AES-GCM) │ sync_records (rid, version,  │──▶│ descifrar        │
│ syncState (seed) ◀──┼── nunca sale ──── │   payload cifrado, seq)      │   │ planMerge (LWW)  │
│                     │◀── pull desde ────│ storage: sync-blobs/ (fotos) │   │ applyRemote      │
└─────────────────────┘    cursor (seq)   └──────────────────────────────┘   └──────────────────┘
         ▲  QR / 12 palabras (en persona, sin servidor)  ─────────────────────────────▶
```

### Derivación de llaves (`crypto.ts`)

```
seed       = 16 bytes aleatorios (crypto.getRandomValues)
frase      = BIP39(seed, lista española)               → 12 palabras
QR         = "tatus-sync:1:" + base64url(seed)          → mismo secreto que la frase

HKDF-SHA256(ikm = seed, salt = "tatus-sync-v1", info = …):
  "space"  → 16 bytes → spaceId (hex)        identificador público de la familia
  "auth"   → 32 bytes → authSecret           prueba de pertenencia (el servidor guarda sha256)
  "enc"    → AES-GCM-256 CryptoKey            cifra cada registro (no extraíble)
  "rid"    → HMAC-SHA256 CryptoKey            rid = HMAC(tbl + ":" + uid) → id opaco
```

- La frase recupera **todo** de forma determinista: mismo seed ⇒ mismo spaceId, misma llave.
- `enc` y `auth` son independientes: quien robe la base de datos y vea los hashes no
  puede descifrar, y conocer `authSecret` no da la llave de cifrado.

### Formato de un registro cifrado

```
Plano (solo en el dispositivo):  SyncRecord { tbl, uid, updatedAt, updatedBy, deleted, data }
En el servidor:
  rid        = HMAC(tbl:uid)                      opaco: el servidor no sabe tabla ni registro
  version    = updatedAt, version_by = updatedBy  para no pisar un cambio más nuevo
  payload    = base64(iv[12] ‖ AES-GCM(JSON(SyncRecord), aad = spaceId|rid))
  blob_path  = solo fotos: el payload va a Storage en spaceId/rid
```

El `aad` ata cada bloque a su hueco: el servidor no puede cambiar un bloque de sitio
sin que el descifrado falle. Al descifrar se usan **los valores de dentro**
(`updatedAt`, `tbl`, `uid`), nunca los que manda el servidor.

### Esquema del servidor (`supabase/migrations/…_sync.sql`)

```sql
create table public.spaces (
  id         text primary key check (id ~ '^[0-9a-f]{32}$'),
  auth_hash  text not null check (auth_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

create table public.space_members (
  space_id  text not null references public.spaces(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

create sequence public.sync_seq;

create table public.sync_records (
  space_id   text   not null references public.spaces(id) on delete cascade,
  rid        text   not null check (length(rid) between 40 and 64),
  version    bigint not null,
  version_by text   not null,
  payload    text   check (payload is null or length(payload) <= 1048576),
  blob_path  text,
  seq        bigint not null,
  primary key (space_id, rid)
);
create index sync_records_pull on public.sync_records (space_id, seq);

alter table public.spaces        enable row level security;
alter table public.space_members enable row level security;
alter table public.sync_records  enable row level security;
-- Políticas: un usuario solo ve/escribe filas de los spaces en los que es miembro.
-- spaces y space_members no se escriben directamente: solo vía RPC security definer.
```

**RPCs** (todas comprueban `auth.uid()` y pertenencia):

| RPC | Qué hace |
|---|---|
| `create_space(p_id, p_auth_hash)` | Crea la familia y añade al usuario como miembro. Falla si el id existe |
| `join_space(p_id, p_auth_secret)` | Compara `sha256(p_auth_secret)` con `auth_hash` en tiempo constante y añade al usuario |
| `push_records(p_space, p_records jsonb)` | `pg_advisory_xact_lock(hashtext(p_space))` y luego upsert de cada registro **solo si `(version, version_by)` es mayor** que el guardado; asigna `seq = nextval` |
| `pull_records(p_space, p_after bigint, p_limit int)` | Devuelve filas con `seq > p_after` ordenadas por `seq` (máx. 500) |

El **bloqueo por familia** en `push_records` serializa las subidas de una misma familia,
así el orden de `seq` coincide con el de commit y un cliente nunca se salta un cambio por
leer en medio de dos transacciones.

**Storage:** bucket privado `sync-blobs`, ruta `{space_id}/{rid}`, políticas por
pertenencia (`split_part(name, '/', 1)`), límite de 1 MB por objeto.

### Estado local (Dexie versión 6)

```ts
// Tabla nueva, NO incluida en SYNC_TABLES ni en el export/backup
syncState: '&id'   // un solo registro { id: 'self', seed, spaceId, cursor, lastSyncAt, lastError, enabled }
```

- `schemaVersion` del **backup** no cambia (sigue en 5): el formato exportado es el mismo.
- La seed nunca se exporta en el backup JSON/HTML. Es deliberado: el backup es para
  guardar, la frase es para recuperar la sincronización.

### Bucle de sincronización (`runner.ts`)

```
syncNow():
  1. si no hay syncState.enabled → salir
  2. SUBIR:  collectOutgoing() → cifrar → (fotos → Storage) → push_records → ackOutgoing()
  3. BAJAR:  repetir pull_records(cursor) hasta vaciar
             → descifrar (si falla: descartar y registrar, nunca romper)
             → applyRemote(); reintentar 'deferred' hasta 3 pasadas
             → guardar cursor = último seq aplicado
  4. guardar lastSyncAt / lastError
Disparadores: al abrir la app, al volver a primer plano (visibilitychange),
  5 s después de la última escritura local, y botón "Sincronizar ahora".
Exclusión: un solo syncNow a la vez (navigator.locks si existe, si no, flag en memoria).
```

---

## User Stories

| ID | Como… | Quiero… | Para… | Prioridad |
|---|---|---|---|---|
| US-1 | padre que usa Tatuś | activar la sincronización y ver mi frase de rescate | tener copia fuera del móvil | **P0** |
| US-2 | padre | confirmar que he apuntado la frase (2 palabras al azar) | no perderla por saltarme el paso | **P0** |
| US-3 | padre con la sync activa | mostrar un QR a mi pareja | que su móvil se una a nuestro archivo | **P0** |
| US-4 | pareja con Tatuś recién instalado | escanear el QR (o escribir las 12 palabras) desde la bienvenida | empezar con el archivo común sin crear un bebé duplicado | **P0** |
| US-5 | cualquiera de los dos | que lo que apunte aparezca en el otro móvil sin hacer nada | no tener que acordarme | **P0** |
| US-6 | padre que ha perdido el móvil | escribir la frase en un móvil nuevo y recuperarlo todo, fotos incluidas | no perder el archivo de mi hijo | **P0** |
| US-7 | padre | ver cuándo se sincronizó por última vez y si hay algo pendiente o un error | confiar en que funciona | **P0** |
| US-8 | padre | sincronizar sin conexión y que se ponga al día al volver la red | usarla en el hospital o el coche | **P0** |
| US-9 | padre | desactivar la sync en este móvil sin borrar nada | dejar de usarla o cambiar de familia | P1 |
| US-10 | pareja que ya tenía datos propios | que me avise antes de mezclarlos con los del archivo común | entender qué va a pasar | P1 |
| US-11 | cualquiera | que los cambios del otro lleguen al momento si tengo la app abierta | vernos actualizados en directo | P1 |
| US-12 | padre que ha perdido un móvil | cambiar la llave para que ese móvil deje de tener acceso | proteger el archivo | P1 |

### Criterios de aceptación clave

- **US-1/2:** la frase se muestra una sola vez en grande, con aviso de guardarla en papel; no se puede continuar sin acertar 2 palabras pedidas al azar.
- **US-4:** si el escaneo no funciona (cámara denegada, iOS antiguo), siempre hay "Escribir las 12 palabras" con autocompletado de la lista española.
- **US-5:** un cambio en A aparece en B en ≤ 10 s si B está abierta y en primer plano; en ≤ 1 apertura si estaba cerrada.
- **US-6:** con la frase, un navegador vacío recupera perfiles, diario, fotos, cartas, crecimiento, registros, citas y checks, con conteos iguales a los del origen.
- **US-8:** cien cambios hechos sin conexión se suben todos al volver la red, sin duplicados.
- **Conflictos:** si A y B editan la misma entrada, gana la última edición en los dos móviles (LWW del motor actual) y los dos acaban iguales.

---

## Auditoría de seguridad

### Modelo de amenazas

| Atacante | Qué consigue | Mitigación |
|---|---|---|
| Supabase / admin / volcado de la BD | Bloques cifrados, número de registros, tamaños, horas de subida, versiones (marcas de tiempo) | AES-GCM con llave que nunca sale de los móviles; ids opacos (HMAC); **riesgo aceptado:** metadatos de volumen y tiempo |
| Atacante con `authSecret` (robo del hash no basta) | Puede unirse a la familia y **leer bloques cifrados** o **borrarlos/estropearlos** | No puede descifrar ni falsificar (AES-GCM + AAD). Borrados maliciosos: los móviles conservan su copia local; P1: detectar y re-subir |
| Servidor malicioso que reordena o devuelve bloques antiguos | Intentar que un móvil "retroceda" | Se usa el `updatedAt` cifrado y LWW: un bloque antiguo nunca gana a uno más nuevo |
| XSS en la app | Robar la seed de IndexedDB | CSP estricta por `<meta>` (sin `unsafe-inline` en scripts, `connect-src` solo `self` + dominio Supabase), sin `dangerouslySetInnerHTML`, dependencias fijadas, `npm audit` en el CI |
| Cadena de suministro (paquete npm comprometido) | Igual que XSS | Versiones exactas en `package.json`, lockfile, solo 4 dependencias nuevas, revisión de cada update |
| Alguien ve el QR o la frase | Acceso total al archivo | Avisos en la UI ("solo a tu pareja, en persona"), el QR desaparece a los 2 min y no se puede capturar en historial; P1: rotar llave |
| Móvil perdido sin bloqueo | Acceso a datos locales (ya ocurre hoy) | Fuera del alcance de la sync; P1: rotación de llave |
| Abuso del servidor (spam de cuentas anónimas) | Coste / cuota | Límite de Auth anónima de Supabase, tamaño máximo por fila y por objeto, cuota por familia (trigger: máx. 20.000 filas y 2 GB) |

### OWASP / checklist aplicado

- [ ] **A01 Control de acceso:** RLS en las 3 tablas + Storage; pruebas pgTAP que demuestran que un usuario no miembro no lee, no escribe y no lista.
- [ ] **A02 Fallos criptográficos:** solo WebCrypto; IV aleatorio de 96 bits por cifrado; llaves `extractable: false`; test de vector fijo (seed → spaceId/rid) y test de manipulación (AAD/IV alterado ⇒ fallo).
- [ ] **A03 Inyección:** RPCs con parámetros tipados; `pull_records` limita `p_limit ≤ 500`; validación con Zod de todo lo que llega del servidor antes de descifrar.
- [ ] **A04 Diseño inseguro:** modelo de amenazas arriba; la seed no está en el backup.
- [ ] **A05 Configuración:** `get_advisors` de Supabase sin avisos de seguridad; bucket privado; sin `service_role` en el cliente.
- [ ] **A07 Autenticación:** Auth anónima solo como identidad de sesión; la pertenencia se prueba con `authSecret`; `join_space` con comparación en tiempo constante y límite de intentos.
- [ ] **A08 Integridad:** AES-GCM autentica cada bloque; lockfile + CI.
- [ ] **A09 Registro:** sin datos sensibles en `console`; `lastError` local con mensaje genérico.
- [ ] **RGPD:** datos de salud de un menor. El proveedor solo trata texto cifrado con ids seudónimos, en la UE. Añadir a Ajustes un texto breve: qué se guarda, dónde, y cómo borrarlo ("Borrar mis datos del servidor" = RPC que borra la familia).

**Hallazgos críticos abiertos: ninguno.** El Blueprint puede ejecutarse.

---

## Resumen de fases

| Fase | Nombre | Entregable demostrable | Stories | Estimación |
|---|---|---|---|---|
| 1 | Cripto y llave local | Tests que cifran, descifran y recuperan desde la frase | US-1 (base), US-6 (base) | 1 día |
| 2 | Servidor Supabase | Migración aplicada, RLS probada, push/pull desde un script | — | 1 día |
| 3 | Bucle de sincronización | Dos navegadores sincronizan texto y fotos (con botón de debug) | US-5, US-8, US-6 | 1,5 días |
| 4 | Pantallas de sincronización | Flujo completo desde Ajustes y desde la bienvenida | US-1, 2, 3, 4, 7 | 1,5 días |
| 5 | Calidad, seguridad y lanzamiento | E2E en CI, CSP, cuotas, documentación, despliegue | todas las P0 | 1 día |
| 6 | Post-MVP (P1) | Realtime, desactivar, aviso de datos previos, rotar llave | US-9 a US-12 | 2 días |

**Total MVP (Fases 1-5): ~6 días de trabajo.** Cada fase va en su propio PR contra `main`.

---

## FASE 1: Cripto y llave local

### 1.0 User Stories
US-1 y US-6 (solo la base criptográfica, sin UI).

### 1.1 Dependencias
- **1.1.1** Instalar `@scure/bip39@2.4.0` con versión exacta y revisar su `package.json` y tamaño.
- **1.1.2** Comprobar en `npm ls` que solo añade `@noble/hashes`.

### 1.2 `src/sync/crypto.ts`
- **1.2.1** Crear `newSeed()`, `seedToPhrase(seed)` y `phraseToSeed(words)` con la lista española; normalizar acentos y mayúsculas al leer.
- **1.2.2** Crear `deriveKeys(seed)` → `{ spaceId, authSecret, encKey, ridKey }` con HKDF-SHA256 (salt `tatus-sync-v1`), llaves no extraíbles.
- **1.2.3** Crear `recordId(ridKey, tbl, uid)` → base64url(HMAC-SHA256).
- **1.2.4** Crear `sealRecord(keys, rec)` y `openRecord(keys, rid, payload)` con AES-GCM, IV de 12 bytes y AAD `spaceId|rid`; `openRecord` valida el JSON con Zod contra `SyncRecord`.
- **1.2.5** Crear `encodeQr(seed)` / `decodeQr(text)` con el prefijo `tatus-sync:1:`.

### 1.3 Estado local
- **1.3.1** Añadir `version(6)` en `src/db/db.ts` con la tabla `syncState` (`&id`); no tocar `SYNC_TABLES`.
- **1.3.2** Crear `src/sync/keyStore.ts`: `getSyncState()`, `saveSyncState()`, `clearSyncState()`.
- **1.3.3** Verificar que `exportBackup`/`importBackup` no incluyen `syncState` y que importar un backup v1-v5 sigue funcionando.

### Checklist de aceptación — Fase 1
- [ ] Test: seed → frase → seed devuelve los mismos bytes; con acentos o mayúsculas distintos, también.
- [ ] Test de vector fijo: una seed conocida produce siempre el mismo `spaceId` y el mismo `rid`.
- [ ] Test: cambiar un byte del payload, del IV o del AAD hace fallar `openRecord`.
- [ ] Test: Dexie migra de v5 a v6 sin perder datos (`fake-indexeddb`).
- [ ] `tsc`, lint y tests en verde; el JS inicial no crece (todo carga bajo demanda).

### Notas técnicas
- `zod` ya está en el árbol de dependencias como transitiva; añadirla como dependencia directa con versión exacta.
- No usar `async/await` dentro del middleware de Dexie (ver comentario en `changeLog.ts`); `crypto.ts` no toca Dexie, así que ahí no aplica.

---

## FASE 2: Servidor Supabase

### 2.1 Proyecto
- **2.1.1** Crear el proyecto `tatus` en la región UE (Frankfurt); activar Auth anónima; desactivar el registro por email.
- **2.1.2** Inicializar `supabase/` en el repo (CLI) para migraciones y pruebas en local.

### 2.2 Migración
- **2.2.1** Escribir `supabase/migrations/20261107000000_sync.sql` con las 3 tablas, la secuencia, el índice y RLS (ver *Esquema del servidor*).
- **2.2.2** Escribir las RPC `create_space`, `join_space`, `push_records` y `pull_records` como `security definer` con `search_path = ''` y comprobación de pertenencia.
- **2.2.3** Crear el bucket privado `sync-blobs` con políticas por pertenencia y límite de 1 MB.
- **2.2.4** Añadir el trigger de cuota por familia (20.000 filas y 2 GB) y una RPC `delete_space` para el borrado RGPD.

### 2.3 Verificación
- **2.3.1** Escribir `supabase/tests/rls.sql` (pgTAP): un no miembro no puede leer, escribir, listar ni subir a Storage; un miembro sí.
- **2.3.2** Probar que `push_records` ignora una versión más antigua y acepta una más nueva.
- **2.3.3** Ejecutar `get_advisors` (seguridad y rendimiento) y dejarlo sin avisos.
- **2.3.4** Guardar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` como Variables de Actions y pasarlas al build en `ci.yml`.

### Checklist de aceptación — Fase 2
- [ ] Migración aplicada en local y en el proyecto remoto.
- [ ] pgTAP en verde.
- [ ] Advisors sin avisos de seguridad.
- [ ] Sin las variables de entorno, el build funciona y no menciona Supabase.

---

## FASE 3: Bucle de sincronización

### 3.0 User Stories
US-5, US-8 y US-6 (lógica, sin UI final).

### 3.1 Transporte
- **3.1.1** Definir la interfaz `Transport` en `src/sync/transport.ts`: `signIn()`, `createSpace()`, `joinSpace()`, `push()`, `pull()`, `putBlob()`, `getBlob()`.
- **3.1.2** Implementar `SupabaseTransport` cargando `@supabase/supabase-js` con `import()`, con sesión anónima persistida y reintentos con backoff ante errores de red.
- **3.1.3** Implementar `MemoryTransport` con la misma semántica de versión y `seq` (incluido el upsert condicional) para los tests.

### 3.2 Runner
- **3.2.1** Crear `syncNow()` en `src/sync/runner.ts` siguiendo el bucle descrito en *Arquitectura*.
- **3.2.2** Subir fotos (`entryPhotos`) cifradas a Storage y dejar en el registro solo `blob_path`; al bajar, descargar y descifrar antes de `applyRemote`.
- **3.2.3** Reintentar los registros `deferred` (hijos antes que padres) hasta 3 pasadas por ciclo y guardar el resto para el siguiente.
- **3.2.4** Añadir los disparadores: arranque, `visibilitychange`, 5 s tras la última escritura (suscripción a `syncChanges`) y llamada manual.
- **3.2.5** Garantizar un solo `syncNow` a la vez (`navigator.locks` o flag).
- **3.2.6** Exponer el estado (`idle | syncing | error`, `lastSyncAt`, `pending`) con un hook `useSyncStatus()`.

### 3.3 Pruebas
- **3.3.1** Test con dos bases Dexie (`fake-indexeddb`, dos nombres) y un `MemoryTransport`: A crea perfil + entrada + foto → B los recibe.
- **3.3.2** Test de conflicto: A y B editan la misma entrada; tras dos ciclos, las dos bases son iguales.
- **3.3.3** Test de borrado: A borra una entrada con fotos; B borra la entrada y sus fotos.
- **3.3.4** Test offline: 100 cambios con el transporte fallando y luego disponible → 100 registros, sin duplicados.
- **3.3.5** Test de recuperación: base vacía + misma seed → contenido completo.

### Checklist de aceptación — Fase 3
- [ ] Todos los tests de 3.3 en verde en el CI.
- [ ] Demo manual: dos perfiles de Chrome contra el Supabase real, con un botón temporal de debug en Ajustes.

---

## FASE 4: Pantallas de sincronización

### 4.0 User Stories
US-1, US-2, US-3, US-4 y US-7.

### Wireframes (móvil, 375 px)

**Ajustes → Sincronizar entre móviles (desactivada)**
```
┌─────────────────────────────────┐
│ ← Sincronizar entre móviles     │
│                                 │
│  Tu archivo, en los móviles de  │
│  los dos. Cifrado: ni nosotros  │
│  podemos leerlo.                │
│                                 │
│  [ Activar sincronización ]     │  ← tinta-600
│                                 │
│  ¿Tu pareja ya la usa?          │
│  [ Unirme con su código ]       │  ← secundario
│                                 │
│  Qué se guarda y dónde  ›       │
└─────────────────────────────────┘
```

**Activar → Tu frase de rescate**
```
┌─────────────────────────────────┐
│  Tu frase de rescate            │
│                                 │
│  Escríbela en papel y guárdala  │
│  con el libro de familia. Con   │
│  ella recuperas todo si perdéis │
│  los móviles. Nadie más la      │
│  tiene, ni nosotros.            │
│                                 │
│   1 pera     5 ...    9 ...     │
│   2 ...      6 ...   10 ...     │
│   3 ...      7 ...   11 ...     │
│   4 ...      8 ...   12 ...     │
│                                 │
│  [ Ya la he apuntado ]          │
└─────────────────────────────────┘
   → pantalla de confirmación: "¿Cuál es la palabra 4? ¿Y la 9?"
```

**Sincronizada (estado)**
```
┌─────────────────────────────────┐
│ ← Sincronizar entre móviles     │
│                                 │
│  ● Al día · hace 2 min          │  ← verde (fase-crecer)
│    3 cambios pendientes         │  ← solo si > 0
│                                 │
│  [ Sincronizar ahora ]          │
│  [ Añadir el móvil de tu pareja]│ → QR a pantalla completa
│                                 │
│  Ver frase de rescate  ›        │  ← pide confirmación
│  Qué se guarda y dónde  ›       │
│  Desactivar en este móvil  ›    │  (P1)
└─────────────────────────────────┘
```

**Unirse (móvil B) — desde Bienvenida o Ajustes**
```
┌─────────────────────────────────┐
│  Unirme al archivo de mi pareja │
│ ┌─────────────────────────────┐ │
│ │      [ vista de cámara ]    │ │
│ │   Apunta al QR de su móvil  │ │
│ └─────────────────────────────┘ │
│  ¿No funciona la cámara?        │
│  [ Escribir las 12 palabras ]   │
└─────────────────────────────────┘
```

### 4.1 Rutas y entrada
- **4.1.1** Declarar `SyncSettings`, `SyncSetup` y `SyncLink` con `lazy()` en `src/router/lazyPages.tsx` y añadir las rutas `ajustes/sync`, `ajustes/sync/activar` y `ajustes/sync/vincular`.
- **4.1.2** Añadir la entrada "Sincronizar entre móviles" en `Settings.tsx` con el estado de `useSyncStatus()` (solo si hay variables de entorno). Aprovechar para sacar secciones de `Settings.tsx`, que está en 494 líneas.
- **4.1.3** Añadir en `Onboarding.tsx` el enlace "Mi pareja ya usa Tatuś" que lleva a `SyncLink` en modo unirse.

### 4.2 Activar (US-1, US-2)
- **4.2.1** Crear `SyncSetup.tsx`: generar seed, `createSpace`, mostrar las 12 palabras y pedir 2 al azar antes de activar.
- **4.2.2** Al confirmar: `queueEverything()` y primer `syncNow()` con barra de progreso ("Subiendo 1.240 recuerdos…").

### 4.3 Vincular (US-3, US-4)
- **4.3.1** Mostrar el QR a pantalla completa con `qrcode` (lazy), aviso de privacidad y cierre automático a los 2 min.
- **4.3.2** Escanear con `BarcodeDetector` nativo o el polyfill `barcode-detector` (lazy, solo al abrir la cámara).
- **4.3.3** Entrada manual de 12 palabras con autocompletado de la lista española y validación de checksum BIP39.
- **4.3.4** Al unirse: `joinSpace`, descarga completa con progreso y paso a Inicio. Si había datos locales, aviso de que se van a combinar (US-10 básico).

### 4.4 Estado (US-7)
- **4.4.1** Mostrar "Al día / Sincronizando / Sin conexión / Error" con la hora de la última sincronización y los pendientes.
- **4.4.2** Pantalla "Qué se guarda y dónde" (texto RGPD) con el botón "Borrar mis datos del servidor".

### UI implementation — prompt
> Pantallas en el estilo existente de Tatuś: fondo `leche`, títulos en Bricolage
> (`font-display`), texto en Atkinson, botón principal `bg-tinta-600 text-leche`
> redondeado `rounded-2xl`, acentos en `yema` solo para lo positivo. Tono tranquilo y
> sin jerga: nada de "cifrado AES" en la UI, sí "nadie más puede leerlo". Las 12
> palabras en Literata, grandes, numeradas, en una cuadrícula de 3 columnas. El QR en
> blanco sobre tinta, centrado, con margen generoso. Contraste AA en todo (el gris
> secundario ya es `#646c7c`).

### Checklist de aceptación — Fase 4
- [ ] Flujo completo en un iPhone real (Safari, app instalada) y en Android Chrome: activar en A, unir B por QR y por palabras.
- [ ] Sin cámara o con el permiso denegado, la entrada manual funciona.
- [ ] Lighthouse: accesibilidad 100 en las pantallas nuevas.
- [ ] El JS inicial no crece: `qrcode`, `barcode-detector` y `supabase-js` solo se descargan en estas pantallas.

---

## FASE 5: Calidad, seguridad y lanzamiento

### 5.1 Pruebas de punta a punta
- **5.1.1** Escribir un test de Playwright con dos contextos de navegador contra un Supabase local (CLI en el CI): A activa, B se une por palabras, A escribe y B lo ve, B borra y A lo ve.
- **5.1.2** Añadir al CI un job que levante `supabase start`, aplique migraciones, pase pgTAP y el E2E.

### 5.2 Endurecimiento
- **5.2.1** Añadir una CSP por `<meta>` en `index.html` (`default-src 'self'`; `connect-src 'self'` + dominio de Supabase; `img-src 'self' data: blob:`; sin `unsafe-eval`) y comprobar que la app y el service worker siguen funcionando.
- **5.2.2** Fijar versiones exactas de las dependencias nuevas.
- **5.2.3** Ejecutar `/adversarial-review` sobre `src/sync/` y la migración, y resolver lo que salga.

### 5.3 Documentación y lanzamiento
- **5.3.1** Actualizar `README.md` (qué es la sync, variables, coste) y `CLAUDE.md` (reglas de cripto: nunca exportar la seed, nunca enviar nada en claro).
- **5.3.2** Desplegar a producción por PR y probar con los dos móviles reales de la familia durante una semana antes de dar por cerrada la feature.

### Checklist de aceptación — Fase 5
- [ ] E2E y pgTAP en verde en el CI.
- [ ] `/adversarial-review` sin hallazgos críticos abiertos.
- [ ] Una semana de uso real en dos móviles sin pérdidas ni duplicados.

---

## FASE 6: Post-MVP (P1)

- **6.1** Realtime (US-11): suscripción a `sync_records` de la familia que lanza `syncNow()`; sin realtime, todo sigue funcionando.
- **6.2** Desactivar en este móvil (US-9): borrar `syncState` y la sesión; los datos locales se quedan.
- **6.3** Aviso al unirse con datos previos (US-10): elegir "Combinar" o "Empezar desde el archivo común" (exportando antes un backup automático).
- **6.4** Rotar la llave (US-12): nueva seed, re-subir todo con la nueva llave, borrar la familia antigua y volver a vincular el otro móvil.
- **6.6** Que nunca se pierda una edición (informe de competencia, nov-2026): si los dos editan la misma entrada a la vez, guardar la versión perdedora como copia ("Versión de tu pareja") en vez de descartarla.
- **6.7** Papelera de 30 días: un borrado que llega del otro móvil va a la papelera y se puede recuperar.
- **6.5** Relleno de tamaño (padding) de los bloques a múltiplos de 1 KB para ocultar mejor el tipo de dato.

---

## Apéndice A: Mapeo US → Fase

| Story | Fase |
|---|---|
| US-1, US-2 | 1 (base) · 4 (UI) |
| US-3, US-4 | 4 |
| US-5, US-8 | 3 |
| US-6 | 1 · 3 · 5 (E2E) |
| US-7 | 3 (estado) · 4 (UI) |
| US-9 a US-12 | 6 |

## Apéndice B: Dependencias entre fases

```
Fase 1 ──┬──▶ Fase 3 ──▶ Fase 4 ──▶ Fase 5 ──▶ Fase 6
Fase 2 ──┘
```
Las Fases 1 y 2 son independientes y pueden hacerse en paralelo.

## Apéndice C: Riesgos

| Riesgo | Impacto | Plan |
|---|---|---|
| Se pierde la frase y todos los móviles | Archivo irrecuperable (por diseño) | Confirmación obligatoria al activar; recordatorio en Ajustes; el backup JSON manual sigue existiendo |
| Proyecto gratuito pausado por inactividad | La sync falla hasta reactivarlo | Mensaje de error claro; datos intactos; valorar plan Pro |
| Tamaño de las fotos (iOS con poca memoria) | Descarga inicial lenta | Descarga paginada con progreso; fotos al final |
| Dos perfiles del mismo bebé | Confusión | Aviso en 4.3.4 y solución en 6.3 |

## Changelog

| Fecha | Cambio |
|---|---|
| 2026-11-07 | Versión inicial: Supabase, QR + frase de rescate, fotos incluidas, ruta corta |
| 2026-11-10 | Fase 6: 6.6 (no perder ediciones simultáneas) y 6.7 (papelera), del informe de competencia |
