#!/usr/bin/env bash
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="$ROOT/dev-server.log"

log() {
  echo "$*"
  echo "[$(date -Iseconds)] $*" >> "$LOG"
}

log "=== dev start ==="
log "Node: $(node -v 2>/dev/null || echo NOT FOUND)"
log "Dir:  $ROOT"

[ -f "$ROOT/.env" ] || cp "$ROOT/.env.example" "$ROOT/.env"

if [ ! -d "$ROOT/node_modules/next" ]; then
  log "node_modules missing — run: npm run setup"
  echo ""
  echo "Run this first:  npm run setup"
  exec bash -l
fi

log "Open http://localhost:3000/login"
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"

set +e
npx next dev --hostname 0.0.0.0 --port 3000 --webpack 2>&1 | tee -a "$LOG"
EXIT=${PIPESTATUS[0]}
set -e

log "Server exited with code $EXIT"
[ "$EXIT" -eq 0 ] || exec bash -l
