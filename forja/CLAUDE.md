# La Forja — Instrucciones para los agentes de Tatuś Sync

Estas reglas se suman a `CLAUDE.md` (raíz del repo), que también tienes que leer.
Si algo choca, gana `CLAUDE.md` de la raíz.

## Qué estás construyendo

Una fase de `BLUEPRINT-tatus-sync.md` (sincronización cifrada de extremo a extremo con
Supabase). Tu prompt dice exactamente **qué fase** te toca. No hagas otras fases.

Documentos que mandan, en este orden:
1. Tu prompt (`forja/prompts/sandbox-N-*.md`)
2. `BLUEPRINT-tatus-sync.md` → sección de tu fase + *Arquitectura* + *Auditoría de seguridad*
3. `.claude/PRPs/PIEZA-tatus-sync.md` → *Gotchas* y *Anti-Patrones*
4. `CLAUDE.md` (raíz)

## Comandos

| Para | Comando |
|---|---|
| Tipos | `npx tsc -b` |
| Lint | `npm run lint` |
| Tests | `npm test` |
| Build (solo al final de tu fase) | `npm run build` |
| Supabase local (solo sandbox 2) | `supabase start` · `supabase db reset` · `supabase test db` · `supabase status` |

## Reglas de ejecución

- Después de cada tarea: `npx tsc -b && npm run lint && npm test`. No avances con algo en rojo.
- Si la misma tarea falla 3 veces, documenta en `PROBLEMAS.md` y pasa a la siguiente.
- Un commit por tarea o grupo pequeño de tareas, formato: `feat(sync-F<N>-T<x.y.z>): descripción`.
- Sin líneas de atribución (`Co-Authored-By`) en los commits.
- **No hagas push, no abras PRs, no toques `main`.** El humano revisa y abre el PR.
- **No commitees** `RESUMEN.md`, `PROBLEMAS.md` ni `DECISIONES.md`: son para la revisión.

## Reglas de disco y dependencias (CRÍTICO)

- Si tu `node_modules` es un **symlink** al repo principal (oleada 1, sandbox sin
  permiso de instalar), **NO ejecutes `npm install`, `npm ci` ni `npm update`**.
- Solo el sandbox que tenga permitido instalar algo (lo dice su prompt) puede usar
  `npm install <paquete>@<versión exacta> --save-exact`, una vez, al principio. Ese
  sandbox tiene su propio `node_modules` (npm sustituye un symlink; ver Auto-Blindaje).
- Antes de instalar un paquete: `npm view <paquete> version time.modified dependencies`.
- No redirijas logs grandes a disco. Si tu worktree supera 2 GB, para y documenta.

## Reglas de seguridad (no negociables)

- Nunca `any`: usa `unknown` + Zod.
- Nunca la seed, llaves o `authSecret` en `console`, en errores, en el backup ni en commits.
- Llaves de WebCrypto con `extractable: false`.
- Toda tabla con RLS; toda RPC comprueba `auth.uid()` y pertenencia.
- Nada de credenciales reales: solo Supabase **local**. No uses ni crees proyectos remotos.

## Al terminar tu fase

1. `npx tsc -b && npm run lint && npm test && npm run build`
2. Escribe `RESUMEN.md` en la raíz del worktree (sin commitear):
   - Tareas hechas (con el id del Blueprint) y commits
   - Checklist de aceptación de la fase marcada con evidencia (comando + resultado)
   - Desviaciones del Blueprint y por qué
   - Qué necesita la siguiente fase de lo que has hecho
3. Si algo quedó pendiente: `PROBLEMAS.md`.
4. Para: no empieces otra fase.
