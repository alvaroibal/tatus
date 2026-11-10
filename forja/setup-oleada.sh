#!/bin/bash
set -e

# ═══════════════════════════════════════════════════════════
# LA FORJA — Setup de una oleada de 1 agente para Tatuś Sync
# Uso: ./forja/setup-oleada.sh <nombre-worktree> <rama> <prompt>
#   ./forja/setup-oleada.sh oleada-3-f4 forja/sync-f4-pantallas forja/prompts/oleada-3-fase-4-literal.md
# El worktree tiene su propio node_modules (npm ci): npm sustituye un symlink
# al instalar paquetes (Auto-Blindaje de la oleada 1).
# ═══════════════════════════════════════════════════════════

if [ $# -ne 3 ]; then
    echo "Uso: $0 <nombre-worktree> <rama> <prompt>"
    exit 1
fi

NAME="$1"
BR="$2"
PROMPT="$3"
REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
FORJA_DIR="$(dirname "$(dirname "$REPO_DIR")")/tatus-forja"
WT="$FORJA_DIR/$NAME"
CREATED=""

cleanup_on_error() {
    if [ $? -ne 0 ] && [ -n "$CREATED" ]; then
        echo "❌ Setup falló. Eliminando $WT..."
        git -C "$REPO_DIR" worktree remove "$WT" --force 2>/dev/null || true
    fi
}
trap cleanup_on_error EXIT

command -v claude >/dev/null || { echo "❌ Claude CLI no encontrado."; exit 1; }

cd "$REPO_DIR"
git fetch -q origin main
[ "$(git rev-parse main)" = "$(git rev-parse origin/main)" ] || { echo "❌ main local ≠ origin/main: git checkout main && git pull --ff-only"; exit 1; }
git cat-file -e "main:$PROMPT" 2>/dev/null || { echo "❌ $PROMPT no está en main. Fusiona primero el PR de esta oleada."; exit 1; }

for d in "$FORJA_DIR"/*/; do
    [ -e "${d}.git" ] && [ "${d%/}" != "$WT" ] && { echo "❌ Queda otro sandbox (${d%/}). Ejecuta ./forja/cleanup.sh primero."; exit 1; }
done

FREE_DISK_GB=$(df -g "$REPO_DIR" | tail -1 | awk '{print $4}')
echo "💾 Disco libre: ${FREE_DISK_GB} GB"
[ "$FREE_DISK_GB" -ge 4 ] || { echo "❌ Menos de 4 GB libres."; exit 1; }

# Docker y Supabase local solo hacen falta para las pruebas manuales del agente.
if command -v docker >/dev/null && docker info >/dev/null 2>&1; then
    if docker ps --format '{{.Ports}}' | grep -q ':54321->'; then
        echo "❌ El puerto 54321 está ocupado por otro Supabase. Páralo con: supabase stop --project-id <id>"
        exit 1
    fi
    echo "🐳 Docker en marcha: el agente podrá usar Supabase local."
else
    echo "⚠️  Docker no está en marcha: el agente no podrá hacer la prueba manual con Supabase local."
    echo "   Abre Docker Desktop antes de lanzarlo si quieres esa prueba."
fi

mkdir -p "$FORJA_DIR"
if [ -d "$WT" ]; then
    echo "   $NAME ya existe, saltando creación..."
else
    if git show-ref --verify --quiet "refs/heads/$BR"; then
        git worktree add "$WT" "$BR"
    else
        git worktree add "$WT" -b "$BR" main
    fi
    CREATED=1
fi

echo "📦 Instalando dependencias en el worktree (npm ci)..."
(cd "$WT" && npm ci --no-audit --no-fund >/dev/null 2>&1)
echo "   ✅ node_modules propio listo"

trap - EXIT

echo ""
echo "═══════════════════════════════════════════════════════"
echo "🔨 LA FORJA — $NAME listo"
echo "═══════════════════════════════════════════════════════"
echo "Lanza el agente en una pestaña:"
echo "  cd \"$WT\" && claude --dangerously-skip-permissions \"\$(cat \"$WT/$PROMPT\")\""
echo ""
echo "Monitor:"
echo "  \"$WT/forja/monitor.sh\""
echo "═══════════════════════════════════════════════════════"
