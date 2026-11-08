#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════
# LA FORJA — Oleada 2 de Tatuś Sync
# 1 agente Literal · Fase 3 (bucle de sincronización)
# El worktree tiene su propio node_modules (npm ci): el agente instala
# @supabase/supabase-js y npm sustituiría un symlink igualmente (Auto-Blindaje).
# ═══════════════════════════════════════════════════════════

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
FORJA_DIR="$(dirname "$(dirname "$REPO_DIR")")/tatus-forja"
WT="$FORJA_DIR/oleada-2-f3"
BR="forja/sync-f3-runner"
PROMPT="forja/prompts/oleada-2-fase-3-literal.md"

cleanup_on_error() {
    if [ $? -ne 0 ] && [ -n "$CREATED" ]; then
        echo "❌ Setup falló. Eliminando $WT..."
        git -C "$REPO_DIR" worktree remove "$WT" --force 2>/dev/null || true
    fi
}
CREATED=""
trap cleanup_on_error EXIT

command -v claude >/dev/null || { echo "❌ Claude CLI no encontrado."; exit 1; }
command -v supabase >/dev/null || { echo "❌ Supabase CLI no encontrado."; exit 1; }
docker info >/dev/null 2>&1 || { echo "❌ Docker no está corriendo. Abre Docker Desktop."; exit 1; }

cd "$REPO_DIR"
git fetch -q origin main
[ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] || { echo "❌ main local ≠ origin/main: git checkout main && git pull --ff-only"; exit 1; }
git cat-file -e "main:$PROMPT" 2>/dev/null || { echo "❌ $PROMPT no está en main. Fusiona primero el PR de la oleada 2."; exit 1; }
git cat-file -e "main:src/sync/crypto.ts" 2>/dev/null || { echo "❌ La Fase 1 no está en main."; exit 1; }
git cat-file -e "main:supabase/migrations/20261107000000_sync.sql" 2>/dev/null || { echo "❌ La Fase 2 no está en main."; exit 1; }

for d in "$FORJA_DIR"/sandbox-*; do
    [ -d "$d" ] && { echo "❌ Quedan sandboxes de la oleada 1 ($d). Ejecuta ./forja/cleanup.sh primero."; exit 1; }
done

FREE_DISK_GB=$(df -g "$REPO_DIR" | tail -1 | awk '{print $4}')
echo "💾 Disco libre: ${FREE_DISK_GB} GB"
[ "$FREE_DISK_GB" -ge 4 ] || { echo "❌ Menos de 4 GB libres."; exit 1; }

if docker ps --format '{{.Ports}}' | grep -q ':54321->'; then
    echo "❌ El puerto 54321 está ocupado por otro Supabase. Páralo con: supabase stop --project-id <id>"
    exit 1
fi

mkdir -p "$FORJA_DIR"
if [ -d "$WT" ]; then
    echo "   oleada-2-f3 ya existe, saltando creación..."
else
    if git show-ref --verify --quiet "refs/heads/$BR"; then
        git worktree add "$WT" "$BR"
    else
        git worktree add "$WT" -b "$BR" main
    fi
    CREATED=1
fi

echo "📦 Instalando dependencias en el worktree (npm ci, ~300 MB)..."
(cd "$WT" && npm ci --no-audit --no-fund >/dev/null 2>&1)
echo "   ✅ node_modules propio listo"

trap - EXIT

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🔨 LA FORJA — Oleada 2 lista"
echo "═══════════════════════════════════════════════════════"
echo "Lanza el agente en una pestaña:"
echo "  cd \"$WT\" && claude --dangerously-skip-permissions \"\$(cat \"$WT/$PROMPT\")\""
echo ""
echo "Monitor:"
echo "  \"$WT/forja/monitor.sh\""
echo "═══════════════════════════════════════════════════════"
