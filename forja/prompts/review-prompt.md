Revisión de la Oleada 1 de La Forja (Tatuś Sync). Dos sandboxes, cada uno con UNA fase distinta (no compiten: se complementan):

- ../../tatus-forja/sandbox-1 (rama forja/sync-f1-cripto) → Literal · Fase 1: cripto y llave local
- ../../tatus-forja/sandbox-2 (rama forja/sync-f2-supabase) → Literal · Fase 2: servidor Supabase local

Cada uno tiene RESUMEN.md y quizá PROBLEMAS.md (sin commitear, en la raíz del worktree).

Haz esto, en orden:
1. Lee los dos RESUMEN.md y PROBLEMAS.md.
2. Para cada rama: git log main..<rama> y git diff main...<rama> completo. Comprueba que cada sandbox solo tocó lo de su fase (sandbox-1: src/sync/crypto.ts, keyStore.ts, db.ts v6, tests, package.json/lock; sandbox-2: supabase/, ci.yml, src/env.d.ts).
3. Verifica el checklist de aceptación de cada fase contra BLUEPRINT-tatus-sync.md re-ejecutando tú los comandos, no fiándote del RESUMEN:
   - sandbox-1: npx tsc -b && npm run lint && npm test && npm run build
   - sandbox-2: supabase start && supabase db reset && supabase test db && supabase db lint (y supabase stop al acabar)
4. Revisión de seguridad específica:
   - crypto.ts: HKDF con salt/info del Blueprint, IV de 12 bytes aleatorio por cifrado, AAD = spaceId|rid, llaves extractable:false, sin la seed en logs/errores/backup, Zod al abrir.
   - SQL: RLS en todas las tablas, ninguna política de escritura directa, RPC security definer con search_path='' y comprobación de pertenencia, revoke a anon, upsert condicional por (version, version_by), advisory lock por familia, límites (500 registros, 1 MB, 20.000 filas), bucket privado con políticas por pertenencia, rate limit de join_space.
5. Conflictos esperados entre ramas: package.json/package-lock.json (solo sandbox-1 debería tocarlos) y .github/workflows/ci.yml (solo sandbox-2). Si alguno tocó ambos, propón cómo resolver.
6. Propón el orden de PRs: primero el que no dependa del otro (en principio son independientes), cada uno en su PR contra main con el CI en verde.
7. Lista lo que la Oleada 2 (Fase 3: transporte + runner) necesita saber de cada fase (firmas exportadas, formato de RPC, desviaciones).

Entrega: veredicto por fase (✅ fusionar / 🔧 fusionar tras arreglos / ❌ rehacer) con los arreglos concretos.
