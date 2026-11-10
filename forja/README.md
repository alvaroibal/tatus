# La Forja — Tatuś Sync

Ejecución de `BLUEPRINT-tatus-sync.md` con agentes autónomos, por oleadas.

## Plan de oleadas

| Oleada | Sandbox | Personalidad | Fase | Necesita |
|---|---|---|---|---|
| **1** ✅ | sandbox-1 · `forja/sync-f1-cripto` | Literal | 1 · Cripto y llave local | — |
| **1** ✅ | sandbox-2 · `forja/sync-f2-supabase` | Literal | 2 · Servidor Supabase (local) | Docker |
| **2** ✅ | oleada-2-f3 · `forja/sync-f3-runner` | Literal | 3 · Bucle de sincronización | Oleada 1 fusionada, Docker |
| 3 | oleada-3-f4 · `forja/sync-f4-pantallas` | Literal | 4 · Pantallas (Supabase local) | Oleada 2 fusionada; Docker para la prueba manual |
| 4 | 1 agente | Literal | 5 · Validación final | Oleada 3 fusionada |

Los prompts de las oleadas 2-4 se generan **después** de revisar la anterior, con lo que
se haya aprendido (firmas reales, desviaciones, Auto-Blindaje).

Cada fase llega a `main` en su propio PR con el CI en verde (`main` está protegida).

## Antes de empezar

1. El plan (Blueprint, Pieza y esta carpeta) tiene que estar fusionado en `main`.
2. Docker Desktop abierto (lo necesita sandbox-2).
3. Cierra apps pesadas: el equipo tiene 8 GB de RAM.

## Pasos

```bash
chmod +x forja/*.sh
./forja/setup.sh       # crea ../../tatus-forja/sandbox-{1,2} desde main
```

Luego abre dos pestañas y pega los dos comandos que imprime el setup. En una tercera:

```bash
./forja/monitor.sh
```

Cuando los dos marquen ✅ TERMINADO, la revisión usa `forja/prompts/review-prompt.md`.

### Oleadas de un agente (2 en adelante)

```bash
./forja/cleanup.sh            # quita los sandboxes de la oleada anterior
./forja/setup-oleada.sh oleada-3-f4 forja/sync-f4-pantallas forja/prompts/oleada-3-fase-4-literal.md
```

`setup-oleada.sh` crea el worktree con su propio `node_modules` e imprime el comando
para lanzar el agente. Docker solo es necesario para las pruebas manuales con Supabase local.

> El proyecto Supabase remoto aún no existe (el plan gratuito permite 2 proyectos activos
> por cuenta y ya están ocupados). La Fase 4 se construye y prueba contra Supabase local.

## Limpieza

```bash
./forja/cleanup.sh     # borra worktrees; solo borra ramas ya fusionadas
```

## Seguridad

Los agentes corren con `--dangerously-skip-permissions`: ejecutan comandos sin pedir
confirmación. Mitigaciones: worktrees aislados fuera de `forge-pro`, solo Supabase
local, sin push ni PRs (los abre el humano tras revisar), y `main` protegida.
