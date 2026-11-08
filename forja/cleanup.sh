#!/bin/bash
set -e
# LA FORJA — Limpieza de sandboxes de Tatuś Sync.
# Borra los worktrees. Las ramas solo se borran si ya están fusionadas en main
# (git branch -d), para no perder trabajo sin revisar.

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
FORJA_DIR="$(dirname "$(dirname "$REPO_DIR")")/tatus-forja"
BRANCHES=("forja/sync-f1-cripto" "forja/sync-f2-supabase")

cd "$REPO_DIR"
echo "🧹 Limpiando sandboxes de La Forja..."

if [ -d "$FORJA_DIR/sandbox-2/supabase" ]; then
    echo "   Parando Supabase de sandbox-2..."
    (cd "$FORJA_DIR/sandbox-2" && supabase stop >/dev/null 2>&1) || true
fi

for i in 1 2; do
    WT="$FORJA_DIR/sandbox-$i"
    if [ -d "$WT" ]; then
        if [ -n "$(git -C "$WT" status --porcelain --untracked-files=no)" ]; then
            echo "   ⚠️  sandbox-$i tiene cambios sin commitear: lo dejo. Revísalo y vuelve a ejecutar."
            continue
        fi
        [ -L "$WT/node_modules" ] && rm "$WT/node_modules"
        git worktree remove "$WT" --force
        echo "   ✅ sandbox-$i eliminado"
    fi
done
git worktree prune

for br in "${BRANCHES[@]}"; do
    if git show-ref --verify --quiet "refs/heads/$br"; then
        if git branch -d "$br" >/dev/null 2>&1; then
            echo "   ✅ rama $br borrada (estaba fusionada)"
        else
            echo "   ℹ️  rama $br conservada (no fusionada en main)"
        fi
    fi
done

rmdir "$FORJA_DIR" 2>/dev/null || true
echo ""
echo "✅ Limpieza completa."
echo "Para recuperar espacio de Docker (imágenes de Supabase): docker system prune -a --volumes"
