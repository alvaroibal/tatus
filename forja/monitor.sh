#!/bin/bash
# LA FORJA — Monitor de sandboxes de Tatuś Sync (se actualiza cada 30 s)

REPO_DIR=$(cd "$(dirname "$0")/.." && pwd)
FORJA_DIR="$(dirname "$(dirname "$REPO_DIR")")/tatus-forja"
NAMES=("sandbox-1 · Literal · Fase 1 cripto" "sandbox-2 · Literal · Fase 2 Supabase")
BRANCHES=("forja/sync-f1-cripto" "forja/sync-f2-supabase")

while true; do
    clear
    echo "═══════════════════════════════════════════════════════"
    echo "🔨 LA FORJA — Tatuś Sync ($(date '+%H:%M:%S'))"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    for i in 0 1; do
        WT="$FORJA_DIR/sandbox-$((i + 1))"
        if [ -d "$WT" ]; then
            LAST=$(git -C "$WT" log --oneline -1 2>/dev/null || echo "sin commits")
            COUNT=$(git -C "$WT" rev-list --count "${BRANCHES[$i]}" ^main 2>/dev/null || echo 0)
            SIZE=$(du -sm "$WT" 2>/dev/null | awk '{print $1}')
            STATUS="⏳ en progreso"
            [ -f "$WT/RESUMEN.md" ] && STATUS="✅ TERMINADO"
            WARN=""
            [ -f "$WT/PROBLEMAS.md" ] && WARN=" ⚠️  hay PROBLEMAS.md"
            [ "${SIZE:-0}" -gt 2048 ] && WARN="$WARN 🔴 disco ${SIZE} MB"
            echo "  ${NAMES[$i]}"
            echo "    Commits: $COUNT | Disco: ${SIZE} MB | $STATUS$WARN"
            echo "    Último: $LAST"
        else
            echo "  ${NAMES[$i]}: ❌ worktree no encontrado"
        fi
        echo ""
    done
    if docker info >/dev/null 2>&1; then
        RUNNING=$(docker ps --filter "name=supabase" -q | wc -l | tr -d ' ')
        echo "  🐳 Contenedores Supabase en marcha: $RUNNING"
    fi
    CLAUDE_TMP="/private/tmp/claude-$(id -u)"
    [ -d "$CLAUDE_TMP" ] && echo "  💾 Claude /tmp: $(du -sm "$CLAUDE_TMP" 2>/dev/null | awk '{print $1}') MB"
    echo "  💾 Disco libre: $(df -g "$REPO_DIR" | tail -1 | awk '{print $4}') GB"
    echo ""
    echo "  Ctrl+C para salir"
    sleep 30
done
