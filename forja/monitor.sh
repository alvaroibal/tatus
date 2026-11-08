#!/bin/bash
# LA FORJA — Monitor de sandboxes de Tatuś Sync (se actualiza cada 30 s).
# Muestra todos los worktrees que haya en ~/tatus-forja, de cualquier oleada.

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
FORJA_DIR="$(dirname "$(dirname "$REPO_DIR")")/tatus-forja"

while true; do
    clear
    echo "═══════════════════════════════════════════════════════"
    echo "🔨 LA FORJA — Tatuś Sync ($(date '+%H:%M:%S'))"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    FOUND=0
    for WT in "$FORJA_DIR"/*/; do
        [ -d "$WT/.git" ] || [ -f "$WT/.git" ] || continue
        FOUND=1
        WT="${WT%/}"
        BR=$(git -C "$WT" branch --show-current 2>/dev/null)
        LAST=$(git -C "$WT" log --oneline -1 2>/dev/null)
        COUNT=$(git -C "$WT" rev-list --count main..HEAD 2>/dev/null)
        SIZE=$(du -sm "$WT" 2>/dev/null | awk '{print $1}')
        STATUS="⏳ en progreso"
        [ -f "$WT/RESUMEN.md" ] && STATUS="✅ TERMINADO"
        WARN=""
        [ -f "$WT/PROBLEMAS.md" ] && WARN=" ⚠️  hay PROBLEMAS.md"
        [ "${SIZE:-0}" -gt 2048 ] && WARN="$WARN 🔴 disco ${SIZE} MB"
        echo "  $(basename "$WT") · $BR"
        echo "    Commits: $COUNT | Disco: ${SIZE} MB | $STATUS$WARN"
        echo "    Último: $LAST"
        echo ""
    done
    [ "$FOUND" = 1 ] || echo "  (no hay sandboxes en $FORJA_DIR)"
    if docker info >/dev/null 2>&1; then
        echo "  🐳 Contenedores Supabase en marcha: $(docker ps --filter name=supabase -q | wc -l | tr -d ' ')"
    fi
    echo "  💾 Disco libre: $(df -g "$REPO_DIR" | tail -1 | awk '{print $4}') GB"
    echo ""
    echo "  Ctrl+C para salir"
    sleep 30
done
