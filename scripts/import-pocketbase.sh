#!/usr/bin/env bash
# Funds — import a PocketBase backup (.zip) into Postgres.
#
# PocketBase `pb backup create` produces a zip of its `pb_data` directory,
# containing the SQLite `data.db` that holds every record. The existing
# migration (apps/web/src/scripts/migrate-from-pocketbase.ts) reads from a live
# PocketBase HTTP API, so this script:
#   1. extracts the backup to a temp dir
#   2. boots a throwaway PocketBase instance over that data dir
#   3. runs the migration (pnpm run db:migrate:pb) against it
#   4. tears everything down
#
# Usage:
#   ./scripts/import-pocketbase.sh <backup.zip> [--dry]
#
# Env:
#   POCKETBASE_BIN    path to a pocketbase binary (default: `pocketbase` on PATH)
#   PB_DOCKER_IMAGE   docker image for the fallback (default: ghcr.io/muchobien/pocketbase:latest)
#   POCKETBASE_PORT   port for the throwaway server (default: 8099)
#   DATABASE_URL      target Postgres (default: postgres://postgres:postgres@localhost:5432/funds)
#   PB_SUPERUSER_EMAIL / PB_SUPERUSER_PASSWORD  throwaway superuser created on the
#                  temp instance so user-scoped records (listRule) are readable
#                  (defaults: import@funds.local / random)

set -euo pipefail

ZIP="${1:-}"
DRY=""
if [ "${2:-}" = "--dry" ]; then DRY="--dry"; fi
if [ -z "$ZIP" ]; then
  echo "usage: $0 <backup.zip> [--dry]" >&2
  exit 1
fi
if [ ! -f "$ZIP" ]; then
  echo "error: backup file not found: $ZIP" >&2
  exit 1
fi
command -v unzip >/dev/null || { echo "error: unzip is required" >&2; exit 1; }
command -v curl  >/dev/null || { echo "error: curl is required" >&2; exit 1; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PORT="${POCKETBASE_PORT:-8099}"
DATABASE_URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/funds}"

WORK="$(mktemp -d)"
PB_PID=""
PB_CONTAINER=""
cleanup() {
  if [ -n "$PB_CONTAINER" ]; then docker rm -f "$PB_CONTAINER" >/dev/null 2>&1 || true; fi
  if [ -n "$PB_PID" ] && kill -0 "$PB_PID" 2>/dev/null; then kill "$PB_PID" 2>/dev/null || true; fi
  rm -rf "$WORK"
}
trap cleanup EXIT INT TERM

echo "Extracting $ZIP ..."
unzip -q "$ZIP" -d "$WORK"

# The backup zip is a pb_data archive; data.db may sit at the zip root or under
# an inner pb_data/ dir.
DB="$(find "$WORK" -name data.db -path '*pb_data*' 2>/dev/null | head -1)"
if [ -z "$DB" ]; then
  DB="$(find "$WORK" -name data.db 2>/dev/null | head -1)"
fi
if [ -z "$DB" ]; then
  echo "error: no data.db found in backup (expected a 'pb backup create' zip)" >&2
  exit 1
fi
DATA_DIR="$(dirname "$DB")"
echo "Found PocketBase data dir: $DATA_DIR"

# All collections are user-scoped (listRule: user = @request.auth.id), so the
# migration must read as a superuser. Create a throwaway superuser on the temp
# instance before it boots.
PB_SUPERUSER_EMAIL="${PB_SUPERUSER_EMAIL:-import@funds.local}"
PB_SUPERUSER_PASSWORD="${PB_SUPERUSER_PASSWORD:-$(openssl rand -hex 12)}"

PB_BIN="${POCKETBASE_BIN:-$(command -v pocketbase || true)}"
if [ -n "$PB_BIN" ]; then
  echo "Creating throwaway superuser (binary) ..."
  "$PB_BIN" superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" --dir "$DATA_DIR" \
    >/dev/null 2>&1 \
    || "$PB_BIN" admin create "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" --dir "$DATA_DIR" \
       >/dev/null 2>&1 \
    || { echo "error: could not create superuser on the PocketBase instance" >&2; exit 1; }
  echo "Booting pocketbase binary on 127.0.0.1:$PORT ..."
  "$PB_BIN" serve --http "127.0.0.1:$PORT" --dir "$DATA_DIR" >/dev/null 2>&1 &
  PB_PID=$!
else
  command -v docker >/dev/null || { echo "error: no pocketbase binary and no docker available" >&2; exit 1; }
  IMAGE="${PB_DOCKER_IMAGE:-ghcr.io/muchobien/pocketbase:latest}"
  echo "Creating throwaway superuser ($IMAGE) ..."
  docker run --rm -v "$DATA_DIR:/pb_data" "$IMAGE" \
    superuser upsert "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" --dir /pb_data \
    >/dev/null 2>&1 \
    || docker run --rm -v "$DATA_DIR:/pb_data" "$IMAGE" \
       admin create "$PB_SUPERUSER_EMAIL" "$PB_SUPERUSER_PASSWORD" --dir /pb_data \
       >/dev/null 2>&1 \
    || { echo "error: could not create superuser on the PocketBase instance" >&2; exit 1; }
  echo "Booting pocketbase ($IMAGE) on 127.0.0.1:$PORT ..."
  PB_CONTAINER="$(docker run -d --rm \
    -p "127.0.0.1:$PORT:8090" \
    -v "$DATA_DIR:/pb_data" \
    "$IMAGE" serve --http "0.0.0.0:8090" --dir "/pb_data")" \
    || { echo "error: failed to run '$IMAGE'. Set POCKETBASE_BIN to a local binary, or PB_DOCKER_IMAGE to another image." >&2; exit 1; }
fi

echo "Waiting for PocketBase API ..."
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1; then break; fi
  sleep 1
done
curl -fsS "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 \
  || { echo "error: PocketBase did not come up on port $PORT" >&2; exit 1; }

echo "Running migration (dry=$([ -n "$DRY" ] && echo yes || echo no)) ..."
(cd "$ROOT" && \
  POCKETBASE_URL="http://127.0.0.1:$PORT" \
  POCKETBASE_EMAIL="$PB_SUPERUSER_EMAIL" \
  POCKETBASE_PASSWORD="$PB_SUPERUSER_PASSWORD" \
  DATABASE_URL="$DATABASE_URL" \
  pnpm run db:migrate:pb $DRY)
