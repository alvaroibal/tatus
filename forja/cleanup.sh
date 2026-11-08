#!/bin/bash
set -e
# LA FORJA — Limpieza de sandboxes de Tatuś Sync (cualquier oleada).
# Borra los worktrees de ~/tatus-forja que no tengan cambios sin commitear.
# Una rama local solo se borra si su PR está fusionado en GitHub (los merges
# son por rebase, así que `git branch -d` no puede saberlo por sí mismo).

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
FORJA_DIR="$(dirname "$(dirname "$REPO_DIR")")/tatus-forja"

cd "$REPO_DIR"
echo "🧹 Limpiando sandboxes de La Forja en $FORJA_DIR..."

for WT in "$FORJA_DIR"/*/; do
    WT="${WT%/}"
    [ -e "$WT/.git" ] || continue
    NAME=$(basename "$WT")
    BR=$(git -C "$WT" branch --show-current 2>/dev/null)

    if [ -d "$WT/supabase" ]; then
        (cd "$WT" && supabase stop >/dev/null 2>&1) || true
    fi
    if [ -n "$(git -C "$WT" status --porcelain --untracked-files=no)" ]; then
        echo "   ⚠️  $NAME tiene cambios sin commitear: lo dejo."
        continue
    fi
    [ -L "$WT/node_modules" ] && rm "$WT/node_modules"
    git worktree remove "$WT" --force
    echo "   ✅ $NAME eliminado"

    if [ -n "$BR" ] && git show-ref --verify --quiet "refs/heads/$BR"; then
        STATE=$(gh pr list --head "$BR" --state merged --json number -q 'length' 2>/dev/null || echo 0)
        if [ "${STATE:-0}" -gt 0 ]; then
            git branch -D "$BR" >/dev/null
            echo "   ✅ rama $BR borrada (PR fusionado)"
        else
            echo "   ℹ️  rama $BR conservada (sin PR fusionado)"
        fi
    fi
done
git worktree prune
rmdir "$FORJA_DIR" 2>/dev/null || true

echo ""
echo "✅ Limpieza completa."
echo "Para recuperar espacio de Docker (imágenes de Supabase): docker system prune -a --volumes"
