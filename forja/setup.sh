#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════
# LA FORJA — Setup de sandboxes (Oleada 1)
# Proyecto: Tatuś Sync
# Agentes: 2 (Literal) · Sandbox 1 → Fase 1 · Sandbox 2 → Fase 2
# Supabase: solo sandbox 2, local en Docker (lo levanta el propio agente)
# ═══════════════════════════════════════════════════════════

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
# Fuera de forge-pro para no ensuciar ese repo
FORJA_DIR="$(dirname "$(dirname "$REPO_DIR")")/tatus-forja"
NUM_AGENTS=2
CREATED_WORKTREES=()

SANDBOXES=("sandbox-1" "sandbox-2")
BRANCHES=("forja/sync-f1-cripto" "forja/sync-f2-supabase")

echo ""
echo "🔨 LA FORJA — Configurando $NUM_AGENTS sandboxes"
echo "📁 Repo:       $REPO_DIR"
echo "📁 Sandboxes:  $FORJA_DIR"
echo ""

cleanup_on_error() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        echo ""
        echo "❌ Setup falló (exit code: $exit_code). Limpiando worktrees creados..."
        for wt in "${CREATED_WORKTREES[@]}"; do
            if [ -d "$wt" ]; then
                [ -L "$wt/node_modules" ] && rm "$wt/node_modules"
                git -C "$REPO_DIR" worktree remove "$wt" --force 2>/dev/null || true
                echo "   🧹 Eliminado: $wt"
            fi
        done
    fi
}
trap cleanup_on_error EXIT

# ─── Verificaciones ──────────────────────────────────────

command -v git >/dev/null || { echo "❌ git no encontrado."; exit 1; }
command -v claude >/dev/null || { echo "❌ Claude CLI no encontrado."; exit 1; }
command -v supabase >/dev/null || { echo "❌ Supabase CLI no encontrado: brew install supabase/tap/supabase"; exit 1; }
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker no está corriendo. Abre Docker Desktop y vuelve a ejecutar este script."
    exit 1
fi

cd "$REPO_DIR"
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || { echo "❌ $REPO_DIR no es un repo git."; exit 1; }

for f in BLUEPRINT-tatus-sync.md .claude/PRPs/PIEZA-tatus-sync.md forja/CLAUDE.md; do
    if ! git cat-file -e "main:$f" 2>/dev/null; then
        echo "❌ $f no está en la rama main. Fusiona primero el PR del plan."
        exit 1
    fi
done

git fetch -q origin main
if [ "$(git rev-parse main)" != "$(git rev-parse origin/main)" ]; then
    echo "❌ main local no coincide con origin/main. Ejecuta: git checkout main && git pull --ff-only"
    exit 1
fi

[ -d "$REPO_DIR/node_modules" ] || { echo "❌ Falta node_modules en el repo principal: ejecuta npm ci primero."; exit 1; }

# ─── Recursos ────────────────────────────────────────────

TOTAL_RAM_GB=$(( $(sysctl -n hw.memsize) / 1073741824 ))
echo "📊 RAM: ${TOTAL_RAM_GB} GB (estimado: ~3 GB por agente + ~2 GB Supabase en Docker)"
if [ "$TOTAL_RAM_GB" -lt 12 ]; then
    echo "   ⚠️  Poca RAM: cierra navegadores y apps pesadas mientras trabajan los agentes."
fi

FREE_DISK_GB=$(df -g "$REPO_DIR" | tail -1 | awk '{print $4}')
echo "💾 Disco libre: ${FREE_DISK_GB} GB (estimado: ~1 GB worktrees + ~3 GB imágenes Supabase)"
if [ "$FREE_DISK_GB" -lt 6 ]; then
    echo "❌ Menos de 6 GB libres. Libera espacio antes de seguir."
    exit 1
fi

CLAUDE_TMP="/private/tmp/claude-$(id -u)"
if [ -d "$CLAUDE_TMP" ]; then
    CLAUDE_TMP_GB=$(( $(du -sm "$CLAUDE_TMP" 2>/dev/null | awk '{print $1}') / 1024 ))
    if [ "$CLAUDE_TMP_GB" -gt 5 ]; then
        echo "⚠️  $CLAUDE_TMP ocupa ${CLAUDE_TMP_GB} GB."
        read -p "¿Continuar de todos modos? (s/N) " -n 1 -r; echo
        [[ $REPLY =~ ^[SsYy]$ ]] || { echo "Cancelado."; exit 0; }
    fi
fi
echo ""

# ─── Worktrees ───────────────────────────────────────────

mkdir -p "$FORJA_DIR"
echo "🌿 Creando worktrees desde main..."
for i in 0 1; do
    WT="$FORJA_DIR/${SANDBOXES[$i]}"
    BR="${BRANCHES[$i]}"
    if [ -d "$WT" ]; then
        echo "   ${SANDBOXES[$i]} ya existe, saltando..."
    else
        if git show-ref --verify --quiet "refs/heads/$BR"; then
            git worktree add "$WT" "$BR"
        else
            git worktree add "$WT" -b "$BR" main
        fi
        CREATED_WORKTREES+=("$WT")
        echo "   ✅ ${SANDBOXES[$i]} (branch: $BR)"
    fi
    if [ ! -L "$WT/node_modules" ]; then
        rm -rf "$WT/node_modules"
        ln -s "$REPO_DIR/node_modules" "$WT/node_modules"
        echo "   🔗 ${SANDBOXES[$i]} → node_modules compartido"
    fi
done

# Que los artefactos de revisión no se cuelen en commits
EXCLUDE_FILE="$(git rev-parse --git-common-dir)/info/exclude"
for p in RESUMEN.md PROBLEMAS.md DECISIONES.md; do
    grep -qxF "/$p" "$EXCLUDE_FILE" 2>/dev/null || echo "/$p" >> "$EXCLUDE_FILE"
done

trap - EXIT

# ─── Resumen ─────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🔨 LA FORJA — Setup completo"
echo "═══════════════════════════════════════════════════════"
git worktree list
echo ""
echo "🚀 Lanza cada agente en su propia pestaña del terminal:"
echo ""
echo "Pestaña 1 (Literal · Fase 1 cripto):"
echo "  cd \"$FORJA_DIR/sandbox-1\" && claude --dangerously-skip-permissions \"\$(cat \"$REPO_DIR/forja/prompts/sandbox-1-literal.md\")\""
echo ""
echo "Pestaña 2 (Literal · Fase 2 Supabase):"
echo "  cd \"$FORJA_DIR/sandbox-2\" && claude --dangerously-skip-permissions \"\$(cat \"$REPO_DIR/forja/prompts/sandbox-2-literal.md\")\""
echo ""
echo "📊 Monitor:"
echo "  \"$REPO_DIR/forja/monitor.sh\""
echo "═══════════════════════════════════════════════════════"
