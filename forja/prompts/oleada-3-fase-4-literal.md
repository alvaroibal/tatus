Eres el agente de la OLEADA 3 de La Forja para Tatuś Sync. Te toca SOLO la FASE 4: "Pantallas de sincronización". Ni E2E en CI, ni CSP, ni cambios de servidor (eso es la Fase 5).

LECTURA OBLIGATORIA, en este orden, antes de tocar nada:
1. CLAUDE.md (raíz) y forja/CLAUDE.md
2. BLUEPRINT-tatus-sync.md → "FASE 4" completa (wireframes, tareas 4.1-4.4, prompt de UI y checklist) y "User Stories" (US-1, 2, 3, 4, 7 con sus criterios)
3. .claude/PRPs/PIEZA-tatus-sync.md → Gotchas, Anti-Patrones y TODO el Auto-Blindaje
4. Código fusionado que vas a USAR sin reescribir:
   - src/sync/runner.ts: enableSync(), joinSync(seed), syncNow(), startSync(), stopSync(), isSyncAvailable(), syncErrorMessage(e). SyncResult y TransportError (códigos: network, denied, invalid, exists, locked, quota, not_found, unknown).
   - src/sync/useSyncStatus.ts: { state: 'off'|'unavailable'|'idle'|'syncing'|'error', lastSyncAt, pending, lastError }
   - src/sync/crypto.ts: seedToPhrase, phraseToSeed (lanza 'Frase no válida'), encodeQr, decodeQr
   - src/sync/keyStore.ts: getSyncState() → seed para volver a mostrar frase/QR
   - src/router/lazyPages.tsx y router.tsx (cómo se declaran pantallas lazy)
   - src/pages/Settings.tsx (499 líneas), src/pages/Onboarding.tsx, src/components/SyncDebug.tsx
   - docs/brand/tatus-manual-de-marca.html y src/index.css (tokens: leche, tinta-*, yema-*, fase-*; gris secundario #646c7c)

PERSONALIDAD: LITERAL.
Fidelidad al plan: implementa los wireframes y tareas de la Fase 4 tal cual, sin añadir pantallas ni opciones que no estén escritas (nada de "desactivar", "rotar llave" ni "combinar datos": son Fase 6, salvo el aviso básico de 4.3.4). Si algo es ambiguo, lo más simple, y apúntalo en RESUMEN.md.

ENTORNO Y DEPENDENCIAS:
- Tu worktree tiene SU PROPIO node_modules: puedes instalar.
- Dependencias permitidas, exactas: qrcode@1.5.4 y @types/qrcode (devDependency, versión exacta que dé npm view), barcode-detector@3.2.3. Antes: npm view <pkg> version dependencies. Nada más.
- Las tres se cargan SOLO con import() dentro de las pantallas de sync (nunca en el arranque).
- Supabase local para probar a mano (requiere Docker Desktop abierto): supabase start -x studio,logflare,vector,edge-runtime,imgproxy,realtime,mailpit,postgres-meta. .env.local con VITE_SUPABASE_URL=http://127.0.0.1:54321 y la anon key de `supabase status`. NO commitees .env.local y BÓRRALO al terminar (Auto-Blindaje: rompía tests). Si Docker no está disponible, haz la parte manual con lo que puedas y documenta en PROBLEMAS.md; los tests automáticos no dependen de Docker.

TAREAS (ids del Blueprint):
- 4.1.1 Declarar SyncSettings, SyncSetup y SyncLink con lazy() en src/router/lazyPages.tsx (patrón existente) y rutas ajustes/sync, ajustes/sync/activar, ajustes/sync/vincular. SyncLink admite modo "mostrar QR" (móvil A) y modo "unirse" (móvil B) por query o ruta, como prefieras (documenta).
- 4.1.2 PRIMERO parte Settings.tsx (499 líneas) en componentes con sentido (p. ej. secciones a src/components/settings/*), sin cambiar comportamiento, en su propio commit; luego añade la fila "Sincronizar entre móviles" con el estado de useSyncStatus(), visible SOLO si isSyncAvailable(). Quita SyncDebug (componente y su uso) en ese mismo trabajo.
  · isSyncAvailable vive en runner.ts (pesado). Para no meter runner en el arranque de Ajustes, crea un helper ligero (p. ej. src/sync/available.ts) que solo mire las variables VITE_SUPABASE_*; úsalo en la fila. useSyncStatus ya es ligero: compruébalo y documenta qué arrastra.
- 4.1.3 En Onboarding.tsx, enlace "Mi pareja ya usa Tatuś" (solo si hay servidor) que lleva a SyncLink en modo unirse.
- 4.2.1 SyncSetup: activar con enableSync() (genera la seed por dentro). Después muestra las 12 palabras (getSyncState().seed → seedToPhrase) en cuadrícula de 3 columnas, Literata, numeradas; botón "Ya la he apuntado" → pide 2 palabras al azar (posiciones distintas, comparación sin acentos ni mayúsculas, reutiliza la normalización de crypto.ts si está exportada o expórtala sin cambiar su comportamiento). Si fallan, vuelve a mostrar la frase.
  · Ojo con el orden: el Blueprint pide confirmar ANTES de activar. enableSync() crea la familia en el servidor al llamarse. Opción literal y simple: generar y enseñar la frase primero requiere separar la creación de la seed de enableSync. Si para respetar "confirmar antes de activar" necesitas cambiar runner.ts, hazlo de la forma mínima (p. ej. enableSync(seed?: Uint8Array) que use la seed dada) con su test, y documéntalo.
- 4.2.2 Tras confirmar: primer syncNow con progreso visible ("Subiendo tus recuerdos…" + recuento si lo tienes del SyncResult; si no, indeterminado). Errores con syncErrorMessage, nunca datos.
- 4.3.1 Mostrar QR a pantalla completa (qrcode lazy, sobre fondo tinta-600 con módulos claros o al revés, con contraste suficiente para escanear), aviso "Enséñalo solo a tu pareja, en persona", se cierra solo a los 2 minutos y al salir de la pantalla. Nunca guardes el QR ni la frase en ninguna parte (ni en URL, ni en historial, ni en localStorage).
- 4.3.2 Escanear: BarcodeDetector nativo si existe; si no, polyfill barcode-detector (lazy). Cámara trasera, getUserMedia solo al pulsar "Escanear", detener las pistas al salir. decodeQr → joinSync.
- 4.3.3 Entrada manual de 12 palabras con autocompletado de la lista española (la de @scure/bip39, lazy) y validación con phraseToSeed (mensaje "Revisa las palabras: alguna no es correcta" si falla).
- 4.3.4 Al unirse: joinSync con progreso; al terminar FIJA appConfig.activeProfileId al primer perfil recibido (appConfig no se sincroniza: sin esto la app manda a la Bienvenida — Auto-Blindaje/RESUMEN de la Fase 3) y navega a Inicio. Si el móvil ya tenía perfiles antes de unirse, muestra antes un aviso de confirmación ("Los datos de este móvil se combinarán con los de tu pareja") usando confirmDialog existente.
- 4.4.1 SyncSettings: estado (Al día · hace X / Sincronizando / Sin conexión / Error + lastError), pendientes si > 0, "Sincronizar ahora", "Añadir el móvil de tu pareja" (→ QR), "Ver frase de rescate" (pide confirmación antes de mostrarla).
- 4.4.2 "Qué se guarda y dónde": texto breve RGPD (qué viaja cifrado, que el servidor no puede leerlo, dónde está —UE—, cómo borrarlo) y botón "Borrar mis datos del servidor" que, con confirmación, borra primero los blobs de Storage de la familia y luego llama a delete_space. Si el Transport no tiene método para esto, añade a la interfaz deleteSpace(spaceId) (+ en MemoryTransport y SupabaseTransport, con test de contrato) y en runner una función deleteFromServer() que además haga clearSyncState() y stopSync(). Los datos locales NO se borran.

DISEÑO (prompt de UI del Blueprint, obligatorio): fondo leche, títulos font-display, texto Atkinson, botón principal bg-tinta-600 text-leche rounded-2xl, yema solo para lo positivo, tono tranquilo sin jerga ("nadie más puede leerlo", nunca "AES"). Usa los componentes y PageHeader existentes. Contraste AA en todo. Botones con área táctil ≥ 44 px. Nada de setState síncrono en useEffect (regla de lint activa).

TESTS (Testing Library si ya está; si no, el patrón de render de useSyncStatus.test.tsx), con MemoryTransport vía setTransport:
- Fila de Ajustes oculta sin servidor y visible con él (stub de las variables con vi.stubEnv o test.env; NO dependas de .env.local).
- SyncSetup: muestra 12 palabras; confirmar con palabras correctas activa (syncState.enabled) y con incorrectas no.
- Unirse por palabras: B con la frase de A recibe los datos y queda con activeProfileId del perfil recibido.
- Aviso de combinar cuando B ya tenía perfiles.
- Borrar del servidor: tras confirmar, el MemoryServer no tiene la familia y syncState queda vacío, pero los datos locales siguen.
- La frase/seed no aparece en localStorage, sessionStorage ni en la URL tras recorrer los flujos.

LOOP POR TAREA: implementa → npx tsc -b && npm run lint && npm test → commit "feat(sync-F4-T<id>): …" (sin líneas de atribución). Máx. 3 intentos; luego PROBLEMAS.md y sigue.

VERIFICACIÓN FINAL (con evidencia en RESUMEN.md):
- [ ] tsc, lint, tests, build en verde (build también con VITE_SUPABASE_URL= VITE_SUPABASE_ANON_KEY= vacías: la sección no aparece y no se descarga nada de sync)
- [ ] JS inicial sin crecer de forma relevante (misma medición que en Fases 1 y 3: gzip de scripts eager de dist/index.html, antes y después, con variables vacías y con variables definidas)
- [ ] grep: qrcode, barcode-detector, @scure/bip39, crypto.ts, runner.ts y supabase-js fuera del arranque
- [ ] Lighthouse accesibilidad de las pantallas nuevas (npx lighthouse o Playwright + axe si está; si no puedes, revisa contraste y roles a mano y documéntalo)
- [ ] Prueba manual con Supabase local en dos contextos de navegador: activar en A (frase + confirmación), unir B por palabras y por QR (si la cámara no está disponible en headless, documenta y prueba el decodificado con una imagen generada), estado y "Sincronizar ahora", borrar del servidor. Capturas en el scratchpad, rutas en RESUMEN.md.
- [ ] .env.local borrado y supabase stop

AL TERMINAR: sigue "Al terminar tu fase" de forja/CLAUDE.md. En RESUMEN.md, "Qué necesita la Fase 5": lo que no pudiste probar (iPhone real, cámara), riesgos de UX, y cualquier cambio que hiciste en runner/transport. No hagas push. No empieces la Fase 5.
