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

echo "==> Ensuring PowerSync publication (FOR ALL TABLES, idempotent)"
PUSER="${POSTGRES_USER:-$(sed -n 's/^POSTGRES_USER=//p' infra/.env)}"
PDB="${POSTGRES_DB:-$(sed -n 's/^POSTGRES_DB=//p' infra/.env)}"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$PUSER" -d "$PDB" -c \
  "DO \$\$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname='powersync') THEN CREATE PUBLICATION powersync FOR ALL TABLES; END IF; END \$\$;"

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

echo "==> Checking PowerSync is running"
for i in $(seq 1 30); do
  [ "$(docker inspect -f '{{.State.Running}}' funds-powersync-1 2>/dev/null)" = "true" ] && { echo "==> Healthy"; exit 0; }
  sleep 2
done
echo "ERROR: powersync did not start" >&2
docker compose -f "$COMPOSE_FILE" logs powersync | tail -40
exit 1