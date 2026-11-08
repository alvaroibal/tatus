Eres el agente de la OLEADA 2 de La Forja para Tatuś Sync. Te toca SOLO la FASE 3: "Bucle de sincronización". Ni pantallas (Fase 4) ni E2E/CSP (Fase 5).

LECTURA OBLIGATORIA, en este orden, antes de tocar nada:
1. CLAUDE.md (raíz) y forja/CLAUDE.md
2. BLUEPRINT-tatus-sync.md → "Arquitectura" (Bucle de sincronización, Formato de un registro cifrado, Esquema del servidor) y "FASE 3"
3. .claude/PRPs/PIEZA-tatus-sync.md → Gotchas, Anti-Patrones y TODO el Auto-Blindaje (hay 4 lecciones de la oleada 1 que te afectan)
4. Código ya fusionado que vas a USAR sin reescribir:
   - src/sync/engine.ts: collectOutgoing, ackOutgoing, queueEverything, applyRemote
   - src/sync/merge.ts: SyncRecord, planMerge, encode/decode
   - src/sync/crypto.ts: deriveKeys, recordId, sealRecord(keys, rid, rec), openRecord(keys, rid, payload)
   - src/sync/keyStore.ts y el tipo SyncState de src/db/db.ts
   - src/sync/__tests__/engine.test.ts: patrón de "dos dispositivos" con fake-indexeddb y vi.resetModules
5. supabase/migrations/20261107000000_sync.sql: contrato real de las RPC (ver abajo)

PERSONALIDAD: LITERAL.
Fidelidad al plan. Implementa exactamente la Fase 3 del Blueprint sin añadir features, patrones ni abstracciones que no estén escritos. Si algo es ambiguo, elige lo más simple y apúntalo en RESUMEN.md ("Desviaciones / interpretaciones"). No toques supabase/migrations (si crees que hace falta un cambio de servidor, documéntalo en PROBLEMAS.md y sigue sin él).

ENTORNO Y DEPENDENCIAS:
- Tu worktree tiene SU PROPIO node_modules (no es un symlink): puedes instalar.
- Única dependencia permitida: npm install @supabase/supabase-js@2.119.0 --save --save-exact (antes: npm view @supabase/supabase-js version dependencies).
- Supabase local para la demo/pruebas manuales: supabase start -x studio,logflare,vector,edge-runtime,imgproxy,realtime,mailpit,postgres-meta  (Docker tiene 3,8 GB). Al terminar: supabase stop.
- Los tests automáticos NO dependen de Supabase: usan MemoryTransport.

CONTRATO DEL SERVIDOR (fusionado y probado con 65 pgTAP):
- Auth: supabase.auth.signInAnonymously() antes de cualquier RPC; sesión persistida.
- rpc('create_space', { p_id: spaceId, p_auth_hash: hex(sha256(authSecret)) }) → void. 23505 si existe.
- rpc('join_space', { p_id, p_auth_secret: hex(authSecret) }) → void. Secreto malo = error con status 403 y cuerpo vacío. P0001 = demasiados intentos. 42501 = familia inexistente o sin sesión.
- rpc('push_records', { p_space, p_records: [{ rid, version, version_by, payload, blob_path }] }) → número aplicado. Máx. 500 por llamada. version = updatedAt, version_by = updatedBy. blob_path nulo o EXACTAMENTE `${spaceId}/${rid}`. version_by ≤ 64.
- rpc('pull_records', { p_space, p_after: cursor, p_limit: 500 }) → [{ rid, version, version_by, payload, blob_path, seq }] ordenado por seq.
- Storage: bucket 'sync-blobs', ruta `${spaceId}/${rid}`, máx. 1 MB por objeto, solo miembros.
- Errores: 42501 sin sesión/no miembro · 22023 parámetro inválido · 23505 ya existe · P0001 bloqueo · 54000 cuota.

TAREAS (ids del Blueprint):
- 3.1.1 src/sync/transport.ts: interfaz Transport con signIn(), createSpace(spaceId, authHashHex), joinSpace(spaceId, authSecretHex), push(spaceId, rows), pull(spaceId, after, limit), putBlob(path, text), getBlob(path). Tipos de fila del servidor validados con Zod al recibir (pull).
- 3.1.2 SupabaseTransport en src/sync/supabaseTransport.ts. Se carga SOLO con import() dinámico desde runner.ts (nunca import estático de @supabase/supabase-js desde código del arranque). Lee VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; si faltan, la sync está "no disponible". Reintentos con backoff (3 intentos, 1 s / 3 s / 9 s) solo ante errores de red, no ante 4xx.
- 3.1.3 src/sync/memoryTransport.ts con la MISMA semántica que el SQL: upsert solo si (version, version_by) es mayor comparando version_by por código de carácter, seq global creciente que se reasigna en cada aplicación, pull por seq, límites (500, 1 MB, blob_path válido), membresía por "usuario".
- 3.2.1 src/sync/runner.ts: syncNow() siguiendo el bucle del Blueprint (subir → bajar → estado). Para cada SyncRecord saliente: rid = recordId(...), payload = sealRecord(keys, rid, rec). Subir en lotes de ≤ 500. ackOutgoing solo tras push correcto.
- 3.2.2 Fotos (tbl 'entryPhotos'): sellar el registro completo, subirlo a Storage en `${spaceId}/${rid}` con putBlob, y mandar en push payload = null, blob_path = esa ruta. Al bajar: comprobar que blob_path === `${spaceId}/${row.rid}` (si no, descartar y registrar), getBlob y openRecord. Si un registro cifrado supera 1 MB, no subirlo: PROBLEMAS/estado de error, nunca romper el bucle.
- 3.2.3 Bajada: pull desde syncState.cursor hasta vaciar; openRecord (si falla → descartar ese registro, contarlo, seguir); comprobar además que el rid recalculado de (tbl, uid) descifrados coincide con row.rid (si no, descartar); applyRemote; reintentar 'deferred' hasta 3 pasadas; guardar cursor = último seq procesado SOLO tras aplicar.
- 3.2.4 Disparadores: arranque, visibilitychange → visible, 5 s después de la última escritura local (suscripción a db.syncChanges con liveQuery o hook de Dexie, debounce), y syncNow() manual exportado.
- 3.2.5 Exclusión: un solo syncNow a la vez (navigator.locks.request('tatus-sync', ...) si existe; si no, flag en memoria). Una llamada mientras otra corre no lanza otra en paralelo.
- 3.2.6 src/sync/useSyncStatus.ts: hook que expone { state: 'off' | 'unavailable' | 'idle' | 'syncing' | 'error', lastSyncAt, pending (count de syncChanges), lastError }. lastError es un mensaje genérico en español, nunca datos.
- Además: funciones enableSync() (nueva seed → deriveKeys → signIn → createSpace → saveSyncState → queueEverything → syncNow) y joinSync(seed) (deriveKeys → signIn → joinSpace → saveSyncState con cursor 0 → syncNow). Sin UI: las usará la Fase 4.
- Botón temporal de debug SOLO si import.meta.env.DEV: en Ajustes, al final, "Sync (debug)" con estado y "Sincronizar ahora". Nada visible en producción.

TESTS (src/sync/__tests__/runner.test.ts y transport.test.ts) con dos dispositivos (patrón de engine.test.ts) y un MemoryTransport compartido:
- 3.3.1 A activa, crea perfil + entrada + foto → B se une con la misma seed → B tiene los tres, con la foto idéntica.
- 3.3.2 Conflicto: A y B editan la misma entrada; tras dos ciclos en cada uno, ambas bases iguales (gana la edición más nueva).
- 3.3.3 Borrado: A borra una entrada con fotos → B borra entrada y fotos.
- 3.3.4 Offline: 100 cambios con el transporte fallando, luego disponible → 100 registros en el servidor, sin duplicados, syncChanges vacío.
- 3.3.5 Recuperación: dispositivo vacío + misma seed → contenido completo (conteos iguales por tabla).
- Seguridad: lo que guarda el MemoryTransport no contiene en claro ningún texto de prueba (busca el texto del diario en el JSON del servidor → 0 apariciones); un payload manipulado o un blob_path de otra familia se descarta sin romper el ciclo.
- Exclusión: dos syncNow simultáneos → una sola ejecución de push.
- Contrato: un test de transport.test.ts que verifique que MemoryTransport rechaza >500 registros, version más antigua y blob_path inválido igual que el SQL.

LOOP POR TAREA: implementa → npx tsc -b && npm run lint && npm test → commit "feat(sync-F3-T<id>): …" (sin líneas de atribución). Máx. 3 intentos por fallo; luego PROBLEMAS.md y sigue.

DEMO MANUAL (al final, con Supabase local): crea .env.local con VITE_SUPABASE_URL=http://127.0.0.1:54321 y la anon key de `supabase status` (NO lo commitees), npm run dev, y en dos perfiles de navegador distintos (o dos contextos de Playwright) activa en uno y únete en el otro con la seed obtenida desde la consola de desarrollo. Documenta en RESUMEN.md lo que viste (o por qué no pudiste).

CRITERIOS DE ACEPTACIÓN DE LA FASE 3 (con evidencia en RESUMEN.md):
- [ ] Todos los tests anteriores en verde; npx tsc -b, npm run lint, npm test, npm run build en verde
- [ ] JS inicial sin crecer de forma relevante (mide como en la Fase 1: gzip de los scripts eager de dist/index.html, antes y después). supabase-js, crypto.ts y bip39 fuera del arranque.
- [ ] grep: ningún import estático de '@supabase/supabase-js' fuera de supabaseTransport.ts; supabaseTransport.ts solo se importa con import()
- [ ] Ninguna seed, llave, authSecret ni contenido en console o en lastError
- [ ] Demo manual documentada

AL TERMINAR: supabase stop, y sigue "Al terminar tu fase" de forja/CLAUDE.md (RESUMEN.md con "Qué necesita la Fase 4": firmas de enableSync/joinSync/syncNow/useSyncStatus y estados de error). No hagas push. No empieces la Fase 4.
