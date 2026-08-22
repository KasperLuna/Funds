#!/usr/bin/env bash
# Funds deploy script (architecture.md §2 CI/CD)
set -euo pipefail

# Compose project files live in infra/
COMPOSE_FILE="infra/docker-compose.yml"
DOMAIN="${DOMAIN:-}"

echo "==> Pulling images"
docker compose -f "$COMPOSE_FILE" pull

echo "==> Building images"
docker compose -f "$COMPOSE_FILE" build

echo "==> Running DB migrations"
pnpm --filter @funds/db run migrate

echo "==> Starting services"
docker compose -f "$COMPOSE_FILE" up -d

# Health check: prefer the public URL, fall back to localhost.
HEALTH_URL="http://localhost:3000/api/health"
if [ -n "$DOMAIN" ]; then
  HEALTH_URL="https://${DOMAIN}/api/health"
fi

echo "==> Waiting for health at ${HEALTH_URL}"
TIMEOUT=120
ELAPSED=0
until curl -fsS "$HEALTH_URL" >/dev/null 2>&1; do
  if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo "ERROR: health check timed out after ${TIMEOUT}s" >&2
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
done

echo "==> Healthy: ${HEALTH_URL}"
