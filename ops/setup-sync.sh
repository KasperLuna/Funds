#!/usr/bin/env bash
# PowerSync logical-replication publication bootstrap (Phase 4, architecture.md §4)
# cavetail: runs on VPS/CI AFTER Drizzle migrations. The PowerSync service container
# manages its own replication slots; this only creates the `powersync` publication.
set -euo pipefail

cd "$(dirname "$0")/.."
COMPOSE_FILE="infra/docker-compose.yml"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-funds}"

echo "==> Waiting for postgres to be healthy"
container="$(docker compose -f "$COMPOSE_FILE" ps -q postgres)"
while [ -z "$container" ] || [ "$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null)" != "healthy" ]; do
  sleep 2
  container="$(docker compose -f "$COMPOSE_FILE" ps -q postgres)"
done

echo "==> Applying ops/setup-sync.sql"
docker compose -f "$COMPOSE_FILE" exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -f - < ops/setup-sync.sql

echo "==> PowerSync publication ready"
