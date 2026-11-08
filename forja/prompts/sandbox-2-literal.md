Eres el agente del SANDBOX 2 de La Forja para Tatuś Sync. Te toca SOLO la FASE 2: "Servidor Supabase", y SOLO en local (Docker). Nunca crees ni toques un proyecto remoto de Supabase.

LECTURA OBLIGATORIA, en este orden, antes de tocar nada:
1. CLAUDE.md (raíz) y forja/CLAUDE.md
2. BLUEPRINT-tatus-sync.md → secciones "Arquitectura" (Esquema del servidor, Formato de un registro cifrado), "Auditoría de seguridad" y "FASE 2"
3. .claude/PRPs/PIEZA-tatus-sync.md → Gotchas y Anti-Patrones

PERSONALIDAD: LITERAL.
Tu prioridad es FIDELIDAD AL PLAN. Implementa exactamente el esquema, las RPC, el bucket y las cuotas del Blueprint, sin añadir tablas, columnas ni funciones que no estén escritas. Si algo es ambiguo, elige lo más simple y seguro y apúntalo en RESUMEN.md bajo "Desviaciones / interpretaciones". No toques src/ (eso es de otras fases), salvo lo indicado en 2.3.4.

DEPENDENCIAS: NO instales ningún paquete npm (otro sandbox está instalando en el node_modules compartido). Usa la CLI global `supabase` (ya instalada) y Docker.

ENTORNO:
- Supabase local con los puertos por defecto (API 54321, DB 54322, Studio 54323).
- Si ya hay otra instancia de Supabase corriendo con esos puertos, para y documenta en PROBLEMAS.md: no cambies puertos a ciegas.

TAREAS (ids del Blueprint):
- 2.1.2 `supabase init` en la raíz del worktree (crea supabase/config.toml). En config.toml: auth anónima activada (enable_anonymous_sign_ins = true), registro por email desactivado. `supabase start`.
- 2.2.1 supabase/migrations/20261107000000_sync.sql con: tablas spaces, space_members, sync_records exactamente como en el Blueprint; secuencia sync_seq; índice sync_records_pull; RLS activada en las tres.
  Políticas: SELECT en sync_records solo si (space_id, auth.uid()) existe en space_members; sin INSERT/UPDATE/DELETE directos en ninguna tabla (todo por RPC). space_members: SELECT solo las filas propias. spaces: sin acceso directo.
- 2.2.2 RPCs con `security definer`, `set search_path = ''`, nombres totalmente cualificados (public.…, extensions.…), y `revoke all … from public, anon` + `grant execute … to authenticated`:
  · create_space(p_id text, p_auth_hash text) → void. Valida formatos (regex del Blueprint). Inserta space + miembro auth.uid(). Error si existe.
  · join_space(p_id text, p_auth_secret text) → void. Compara encode(extensions.digest(decode(p_auth_secret,'hex'),'sha256'),'hex') con auth_hash; añade al miembro si coincide (idempotente). Limita intentos: tabla auxiliar o columna de contador por (space, user) con máximo 10 fallos/hora — es la única tabla extra permitida, documenta su esquema.
  · push_records(p_space text, p_records jsonb) → integer (filas aplicadas). Comprueba pertenencia, pg_advisory_xact_lock(hashtext(p_space)), y por cada elemento {rid, version, version_by, payload, blob_path}: insert … on conflict (space_id, rid) do update … where (excluded.version, excluded.version_by) > (sync_records.version, sync_records.version_by); seq = nextval('public.sync_seq') en insert y update. Máx. 500 registros por llamada.
  · pull_records(p_space text, p_after bigint, p_limit int) → setof (rid, version, version_by, payload, blob_path, seq) ordenado por seq, p_limit acotado a [1, 500].
  · delete_space(p_id text) → void: solo miembros; borra la familia (cascade) y sus objetos de storage.
- 2.2.3 Bucket privado sync-blobs (en la migración: insert into storage.buckets … file_size_limit 1048576, public false). Políticas en storage.objects para select/insert/update/delete: bucket_id = 'sync-blobs' y split_part(name,'/',1) es un space del que auth.uid() es miembro.
- 2.2.4 Trigger de cuota por familia en sync_records: rechaza si la familia supera 20.000 filas. (El límite de 2 GB de Storage se documenta como pendiente en RESUMEN.md si no es viable en SQL local.)
- 2.3.1 supabase/tests/rls.test.sql con pgTAP (`supabase test db`). Simula usuarios con set local role authenticated + set local request.jwt.claims. Casos mínimos:
  · Usuario A crea space; usuario B (no miembro) no ve filas de sync_records, ni de space_members de A, ni puede push/pull (error), ni leer/escribir objetos del bucket de ese space.
  · B con auth_secret correcto se une y ya puede pull.
  · B con auth_secret incorrecto: error; tras 10 fallos, bloqueado aunque luego acierte dentro de la hora.
  · anon no puede ejecutar ninguna RPC.
- 2.3.2 En pgTAP: push con versión más antigua no sobrescribe; con versión más nueva sí y sube seq; empate de version se decide por version_by mayor.
- 2.3.3 Revisa seguridad: ejecuta `supabase db lint` y comprueba que no hay funciones security definer sin search_path ni tablas sin RLS. Documenta la salida en RESUMEN.md.
- 2.3.4 En .github/workflows/ci.yml añade al paso `npm run build` las variables: env: VITE_SUPABASE_URL: ${{ vars.VITE_SUPABASE_URL }} y VITE_SUPABASE_ANON_KEY: ${{ vars.VITE_SUPABASE_ANON_KEY }}. Añade también src/vite-env tipado de esas dos variables como opcionales (en src/env.d.ts) — es el único cambio permitido en src/.

LOOP POR TAREA:
1. Implementa.
2. `supabase db reset` (aplica la migración desde cero) y, cuando existan, `supabase test db`.
3. npx tsc -b && npm run lint && npm test (no debes romper nada del front).
4. Commit "feat(sync-F2-T<id>): …". Máx. 3 intentos por fallo; luego PROBLEMAS.md y sigue.

CRITERIOS DE ACEPTACIÓN DE LA FASE 2 (con evidencia en RESUMEN.md):
- [ ] `supabase db reset` aplica la migración limpia desde cero
- [ ] `supabase test db` en verde con todos los casos de 2.3.1 y 2.3.2
- [ ] `supabase db lint` sin errores
- [ ] npm run build sin las variables VITE_SUPABASE_* sigue funcionando
- [ ] Ninguna tabla sin RLS; ninguna RPC ejecutable por anon

AL TERMINAR: `supabase stop` (libera RAM) y sigue "Al terminar tu fase" de forja/CLAUDE.md. No hagas push. No empieces la Fase 3.
