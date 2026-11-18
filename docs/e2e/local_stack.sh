#!/usr/bin/env bash
# Stack local para probar la app sin tocar producción:
#   - backend en http://localhost:4000 (estado en memoria: sin variables de Blob/Redis)
#   - web exportada en http://localhost:8099/app/ (apunta al backend local)
# Uso:
#   bash docs/e2e/local_stack.sh            # compila la web y levanta todo
#   bash docs/e2e/local_stack.sh --no-build # reusa frontend/dist
#   bash docs/e2e/local_stack.sh --stop     # baja los dos procesos
# Logs y caché de Metro en $RUN_DIR (por defecto ~/.baprotege-local).
# El login con Google queda deshabilitado (no hay GOOGLE_CLIENT_ID): es lo esperado.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
RUN_DIR="${RUN_DIR:-$HOME/.baprotege-local}"
API_PORT="${API_PORT:-4000}"
WEB_PORT="${WEB_PORT:-8099}"
LOCK="${HEAVY_LOCK:-/root/innova/.heavy.lock}"
mkdir -p "$RUN_DIR/tmp"

heavy() { if [ -e "$LOCK" ]; then flock "$LOCK" "$@"; else "$@"; fi; }

stop_port() {
  local pids
  pids="$(ss -ltnpH "sport = :$1" 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u || true)"
  for pid in $pids; do
    # Baja el grupo entero (npm -> ts-node-dev -> node).
    kill -- "-$(ps -o pgid= "$pid" | tr -d ' ')" 2>/dev/null || kill "$pid" 2>/dev/null || true
  done
}

wait_http() {
  for _ in $(seq 1 60); do
    curl -fsS -o /dev/null "$1" 2>/dev/null && return 0
    sleep 1
  done
  echo "No respondió $1" >&2
  return 1
}

stop_port "$API_PORT"
stop_port "$WEB_PORT"
if [ "${1:-}" = "--stop" ]; then
  echo "Stack local detenido."
  exit 0
fi

echo "Backend en :$API_PORT (log: $RUN_DIR/backend.log)"
(
  cd "$REPO/backend"
  PORT="$API_PORT" JWT_SECRET="${JWT_SECRET:-dev-local-secret}" ADMIN_SECRET="${ADMIN_SECRET:-dev-admin-secret}" \
    setsid nohup npm run dev >"$RUN_DIR/backend.log" 2>&1 < /dev/null &
)

if [ "${1:-}" != "--no-build" ]; then
  echo "Compilando la web contra http://localhost:$API_PORT ..."
  (
    cd "$REPO/frontend"
    # TMPDIR propio: la caché de Metro en /tmp se comparte entre worktrees.
    TMPDIR="$RUN_DIR/tmp" CI=1 EXPO_PUBLIC_API_URL="http://localhost:$API_PORT" heavy npm run build:web
  )
fi

echo "Web en :$WEB_PORT (log: $RUN_DIR/web.log)"
setsid nohup node "$REPO/docs/e2e/serve_local.mjs" "$REPO/frontend/dist" "$WEB_PORT" \
  >"$RUN_DIR/web.log" 2>&1 < /dev/null &

wait_http "http://localhost:$API_PORT/health"
wait_http "http://localhost:$WEB_PORT/app/"
echo "Listo: http://localhost:$WEB_PORT/app/  (API http://localhost:$API_PORT)"
