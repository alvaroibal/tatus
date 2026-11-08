# La Forja — Tatuś Sync

Ejecución de `BLUEPRINT-tatus-sync.md` con agentes autónomos, por oleadas.

## Plan de oleadas

| Oleada | Sandbox | Personalidad | Fase | Necesita |
|---|---|---|---|---|
| **1** (paralelo) | sandbox-1 · `forja/sync-f1-cripto` | Literal | 1 · Cripto y llave local | — |
| **1** (paralelo) | sandbox-2 · `forja/sync-f2-supabase` | Literal | 2 · Servidor Supabase (local) | Docker |
| 2 | 1 agente | Literal | 3 · Bucle de sincronización | Oleada 1 fusionada |
| 3 | 1 agente | Literal | 4 · Pantallas | Oleada 2 fusionada |
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

## Limpieza

```bash
./forja/cleanup.sh     # borra worktrees; solo borra ramas ya fusionadas
```

## Seguridad

Los agentes corren con `--dangerously-skip-permissions`: ejecutan comandos sin pedir
confirmación. Mitigaciones: worktrees aislados fuera de `forge-pro`, solo Supabase
local, sin push ni PRs (los abre el humano tras revisar), y `main` protegida.
