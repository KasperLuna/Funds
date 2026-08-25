#!/usr/bin/env bash
# Funds deploy script — manual equivalent of .github/workflows/ci.yml.
# The host never builds: images are built + pushed to ghcr.io by the pre-commit
# hook on a developer machine. This script pulls, migrates, and starts the stack.
# Prefer CI (push to main or workflow_dispatch); this is for hands-on deploys.
set -euo pipefail

COMPOSE_FILE="infra/docker-compose.yml"

echo "==> Login GHCR"
echo "${GHCR_TOKEN:?set GHCR_TOKEN or docker login ghcr.io first}" \
  | docker login ghcr.io -u KasperLuna --password-stdin

echo "==> Pulling images (before teardown so a failed pull leaves the stack up)"
docker compose -f "$COMPOSE_FILE" pull

echo "==> Tearing down + pruning"
docker compose -f "$COMPOSE_FILE" down --remove-orphans
docker image prune -af

echo "==> Starting postgres + waiting"
docker compose -f "$COMPOSE_FILE" up -d --no-build postgres
for i in $(seq 1 120); do
  docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready >/dev/null 2>&1 && break
  sleep 2
done
docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready

echo "==> Running DB migrations (host-side, localhost:5432)"
pnpm --filter @funds/db run migrate

echo "==> Starting services"
docker compose -f "$COMPOSE_FILE" up -d --no-build

echo "==> Waiting for web health"
WEB_PORT="${WEB_HOST_PORT:-$(sed -n 's/^WEB_HOST_PORT=//p' infra/.env 2>/dev/null)}"
WEB_PORT="${WEB_PORT:-13000}"
TIMEOUT=60
ELAPSED=0
until curl -fsS "http://localhost:${WEB_PORT}/api/health" >/dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "ERROR: web health check timed out" >&2
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo "==> Web healthy"