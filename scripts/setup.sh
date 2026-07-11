#!/usr/bin/env bash
# Full reinstall + dev start. Writes setup.log even if terminal closes.
set -uo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
LOG="$ROOT/setup.log"

log() {
  local msg="[$(date -Iseconds)] $*"
  echo "$msg"
  echo "$msg" >> "$LOG"
}

log "========== SETUP START =========="
log "PWD: $ROOT"
log "Node: $(command -v node >/dev/null && node -v || echo MISSING)"
log "npm:  $(command -v npm >/dev/null && npm -v || echo MISSING)"

if ! command -v node >/dev/null; then
  log "ERROR: Node.js not installed in WSL."
  log "Install: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
  exec bash -l
fi

if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  log "Created .env from .env.example"
fi

log "Removing .next cache..."
rm -rf "$ROOT/.next"

log "Running npm install..."
if ! npm install >> "$LOG" 2>&1; then
  log "ERROR: npm install failed — see setup.log"
  tail -20 "$LOG"
  exec bash -l
fi

log "Generating Prisma client..."
if ! npx prisma generate >> "$LOG" 2>&1; then
  log "WARNING: prisma generate failed — see setup.log"
fi

log "Starting dev server (webpack mode, port 3000)..."
log "Open: http://localhost:3000/login"
echo ""
echo "Setup log: $LOG"
echo "Dev log:   $ROOT/dev-server.log"
echo ""

export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"
exec npx next dev --hostname 0.0.0.0 --port 3000 --webpack 2>&1 | tee -a "$ROOT/dev-server.log"
