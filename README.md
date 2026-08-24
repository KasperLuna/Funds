# Funds

Local-first, multi-currency personal finance tracker. Next.js (App Router) PWA + PowerSync for offline-first sync, Postgres behind it, deployed on a single VPS behind a Cloudflare tunnel.

- **Product/UX/domain specs:** `docs/design.md`, `docs/product.md`, `docs/logic.md`
- **Architecture + stack decisions:** `docs/architecture.md`
- **Implementation plan + live operational notes:** `docs/implementation.md`

> This README is the operations manual: how to rebuild the whole stack from scratch, how a deploy works, and how to operate the running system. It is written to be verbose on purpose — follow it top to bottom on a fresh box.

---

## 1. Repo layout

```
apps/web          Next.js app (tRPC routes, PWA, sync client, auth)
packages/core     pure logic: money, parser, recurrence, lots/cost-basis (framework-free, unit-tested)
packages/db       Drizzle schema + migrations + seeds
infra/            docker-compose.yml, powersync.yaml, .env.example (template)
ops/              deploy.sh (manual deploy), setup-sync.{sh,sql}, worker/ (not yet deployed)
scripts/          import-pocketbase.sh (PocketBase backup → Postgres)
docs/             architecture, design, implementation, logic, product
.githooks/        pre-commit: verification + image build/push gate
.github/workflows/ci.yml   deploy-only pipeline (self-hosted runner)
```

## 2. Architecture at a glance

```
Browser (PWA, offline-first SQLite over OPFS)
   │  tRPC (/api/trpc, /api/auth, /api/sync/token, /api/voice, /api/health)
   │  PowerSync SDK → POST /sync/stream (proxied by the web app → powersync:8080)
   ▼
Cloudflare tunnel (cloudflared systemd service on the VPS) ── TLS, DNS
   ▼
VPS (Debian) — Docker Compose, 127.0.0.1-bound ports only:
   web        Next.js standalone (linux/amd64 image pulled from ghcr.io)
   postgres   PG16, wal_level=logical, volume `pgdata`
   powersync  PowerSync service, per-user sync buckets
```

Details in `docs/architecture.md`. Key topology facts:

- All host ports bind to `127.0.0.1` only. Nothing is exposed to the internet except through cloudflared. Defaults: web `13000`, powersync `18080`, postgres `5432` (configurable via `WEB_HOST_PORT` / `POWERSYNC_HOST_PORT` in `infra/.env`).
- The web app **proxies `/sync/stream` to powersync internally** (`apps/web/src/app/sync/stream/route.ts`, target `POWER_SYNC_INTERNAL_URL` default `http://powersync:8080`). A single Cloudflare catch-all ingress rule is therefore sufficient; a `/sync/*` rule is optional.
- The deploy creates the Postgres `powersync` publication (`FOR ALL TABLES`) idempotently — the service does **not** auto-create it.
- Containers are memory-capped (`mem_limit`) so a runaway restarts instead of OOM-ing the host, which also runs other proxy workloads.

## 3. The deploy model (read this first)

The VPS is also a proxy and **OOMs under a heavy `next build`**. The whole pipeline is shaped around never building on the host:

```
1. You commit on your machine.
2. .githooks/pre-commit runs: lint → typecheck → test (throwaway PG) →
   docker buildx build --platform linux/amd64 --push → ghcr.io/kasperluna/funds-web:latest
3. You push to main.
4. .github/workflows/ci.yml on the self-hosted runner:
   write infra/.env (from ENV_FILE secret) → login GHCR → pull (before teardown) →
   down + prune → up postgres → wait → migrate (host-side) → ensure powersync
   publication → up -d --no-build → health checks (web + powersync).
5. Done. The host never compiles anything.
```

Consequences:

- **Commits are slow.** The pre-commit image build runs qemu `linux/amd64` emulation on Apple Silicon. It's cached after the first run, but the first build of a changed `apps/web` is minutes. Skip it for non-app changes: `SKIP_DOCKER_PUSH=1 git commit`.
- **`latest` tag.** Deploys pull `:latest`. The image for any commit is reproducible in git history (re-checkout + build + push), so rollback = redeploying an older commit.
- **The pipeline is deploy-only.** Broken code is caught by the pre-commit hook, not by CI. Keep the hook on.

### Enabling the pre-commit hook

```bash
git config core.hooksPath .githooks
```

The hook needs: Docker running, the throwaway test PG (it starts `funds-test-pg` on `127.0.0.1:54329` automatically), and once-only `docker login ghcr.io`.

---

## 4. Local development

Prerequisites: Node ≥ 22.13 (pnpm 11.6 requires it), pnpm 9+, Docker.

```bash
pnpm install --frozen-lockfile
cp infra/.env.example infra/.env        # fill in dev values (or use infra/.env.prod)
```

Run the app:

```bash
pnpm --filter @funds/web dev             # http://localhost:3000
```

DB tooling (all against `infra/.env`-provided `DATABASE_URL`, or the `DATABASE_URL` env var):

```bash
pnpm db:migrate     # Drizzle migrations
pnpm db:seed        # seed assets + demo user (idempotent)
pnpm db:clean       # wipe data
```

Tests / checks (also what the pre-commit hook runs):

```bash
pnpm test           # workspace, serial (--workspace-concurrency=1), needs test PG on 54329
pnpm typecheck
pnpm lint
```

Local sync (optional): `docker compose -f infra/docker-compose.yml up -d postgres powersync` then point dev `.env` at `http://localhost:18080`.

---

## 5. Host / VPS setup from scratch

Assumes a fresh Debian (or Ubuntu) VPS with `sudo` access, user `debian`.

### 5.1 Docker + user group

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker debian        # re-login (or `newgrp docker`) after
```

### 5.2 Swap (protects against OOM)

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 5.3 Self-hosted GitHub Actions runner

Repo → Settings → Actions → Runners → *New self-hosted runner*. Copy the registration token (it expires in ~1h).

```bash
mkdir -p /home/debian/funds-runner && cd /home/debian/funds-runner
# download + extract the runner per the instructions shown in the GitHub UI
./config.sh --url https://github.com/KasperLuna/Funds --token <FRESH_TOKEN> \
  --unattended --replace --labels self-hosted
sudo ./svc.sh install && sudo ./svc.sh start
```

Make it survive reboots and crashes:

```bash
sudo systemctl enable actions.runner.KasperLuna-Funds.funds-actions.service
sudo systemctl edit --full actions.runner.KasperLuna-Funds.funds-actions.service
#   under [Service] add:
#   Restart=always
#   RestartSec=5
sudo systemctl daemon-reload && sudo systemctl restart actions.runner.KasperLuna-Funds.funds-actions.service
```

Verify: `gh api repos/KasperLuna/Funds/actions/runners` shows `online`.

> The runner workspace (`/home/debian/funds-runner/_work/Funds/Funds`) keeps a checkout + node_modules from the last deploy. Useful for running repo scripts on the VPS (see §8.4).

### 5.4 cloudflared tunnel + DNS

```bash
# install cloudflared, then register the tunnel with your token
cloudflared service install <TUNNEL_TOKEN>   # systemd service, auto-start
```

Zero Trust → Networks → Tunnels → your tunnel → **Public Hostname**:

| Hostname | Path | Service |
|---|---|---|
| `funds.kasperluna.com` | `/sync/*` (optional) | `http://localhost:18080` |
| `funds.kasperluna.com` | *(empty, catch-all)* | `http://localhost:13000` |

Cloudflare auto-creates the DNS record. Most-specific rules win; the `/sync/*` rule is optional because the web app proxies the sync stream (§2).

### 5.5 Google OAuth

Google Cloud Console → *OAuth consent screen* → Credentials → your Web client (ID ends `…065520`):

- **Authorized JavaScript origins:** `https://funds.kasperluna.com`
- **Authorized redirect URIs:** `https://funds.kasperluna.com/api/auth/callback/google`

Exact match — no trailing slash, no `www`. Errors like `redirect_uri_mismatch` mean these don't match `BETTER_AUTH_URL` (auth.ts:16). No redeploy needed after editing; saves in seconds.

### 5.6 GitHub repository secrets

Repo → Settings → Secrets and variables → Actions → *New repository secret*:

| Secret | Value |
|---|---|
| `ENV_FILE` | Full contents of the production `infra/.env` (from `infra/.env.prod`). Container-style URLs (`postgres:` host), real secrets. |
| `DATABASE_URL` | **Host-style** URL for CI's host-side migrate: `postgres://<user>:<pw>@localhost:5432/funds`. Same password, `localhost` host. |
| `GHCR_TOKEN` | GitHub PAT (classic) with `write:packages` — used to pull ghcr images on the host. |

One-time on the dev machine: `echo <PAT> | docker login ghcr.io -u KasperLuna --password-stdin`.

### 5.7 First deploy

Trigger manually: `gh workflow run Deploy` (or push to `main`). The deploy writes `infra/.env` from `ENV_FILE` every run, so CI always uses current secrets.

---

## 6. Environment variables reference

Source of truth: `infra/.env.example`. `infra/.env` is written by CI from the `ENV_FILE` secret; `infra/.env.prod` is the local-only production copy (gitignored).

| Var | Consumed by | Notes |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | postgres container | Password **must be URL-safe (alphanumeric)** — see §9.3 |
| `DATABASE_URL` | web container (env_file) | Container-style: `postgres://…@postgres:5432/funds` |
| `PS_DATABASE_URL` | powersync (via compose) | Same as DATABASE_URL; powersync replication + storage |
| `WEB_HOST_PORT` / `POWERSYNC_HOST_PORT` | compose bindings | Defaults 13000 / 18080 |
| `DOMAIN` | (ops scripts) | `funds.kasperluna.com` |
| `PUBLIC_APP_URL` | auth.ts trustedOrigins | Full origin, e.g. `https://funds.kasperluna.com` |
| `BETTER_AUTH_URL` | auth.ts baseURL | Full origin; drives OAuth `redirect_uri` |
| `BETTER_AUTH_SECRET` | auth.ts | ≥32 chars |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | auth.ts | Google provider enabled only when both set |
| `POWER_SYNC_URL` | `/api/sync/token` | Public base the SDK streams to; must be `https://…` (SDK appends `/sync/stream`) |
| `POWER_SYNC_INTERNAL_URL` | `app/sync/stream/route.ts` | Default `http://powersync:8080` (compose DNS) |
| `POWER_SYNC_JWT_SECRET_B64URL` | token route + powersync jwks | base64url of the HS256 secret; MUST match between web and powersync |
| `POWER_SYNC_SECRET` | (reserved) | |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | push | |
| `CRON_SECRET` | cron/webhook endpoints | |
| `COINGECKO_API_KEY` | rates refresh (future worker) | |
| `BACKEND_BASE_URL` | (unused — dead) | Kept in template |
| `APP_URL` / `CRON_AUTH` | `ops/worker` (not yet deployed) | |

Generate `POWER_SYNC_JWT_SECRET_B64URL` from `JWT_SECRET`:

```bash
printf '%s' "$JWT_SECRET" | base64 | tr '+/' '-_' | tr -d '=\n'
```

---

## 7. Deploy & operations

### 7.1 Deploy

- **Automatic:** push to `main` → workflow runs.
- **Manual:** `gh workflow run Deploy` (workflow has `workflow_dispatch`).

Watch: `gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId')`.

### 7.2 Manual deploy (equivalent of CI, if you need hands-on)

```bash
# from a repo checkout on the host, with GHCR_TOKEN set and pnpm/node on PATH
bash ops/deploy.sh
```

### 7.3 Logs / restart / psql

```bash
docker compose -f infra/docker-compose.yml logs -f web          # app
docker compose -f infra/docker-compose.yml logs -f powersync    # sync service
docker compose -f infra/docker-compose.yml restart powersync
docker exec -it funds-postgres-1 psql -U postgres -d funds      # SQL shell (no pw needed inside container)
```

### 7.4 Rollback

Redeploy an older commit: `git checkout <old-sha>`, let pre-commit rebuild + push `:latest` (or run the build manually), push to `main`. The image tag `:latest` then points at the older code.

### 7.5 Backups (Postgres)

```bash
# inside the postgres container (or via docker exec -i on host)
pg_dump -U postgres -d funds | gzip > funds-$(date +%F).sql.gz
```

Restore (wipes current data — confirm first):

```bash
docker exec funds-postgres-1 psql -U postgres -d postgres -c "DROP DATABASE funds WITH (FORCE); CREATE DATABASE funds OWNER postgres;"
gunzip -c funds-$(date +%F).sql.gz | docker exec -i funds-postgres-1 psql -U postgres -d funds
# recreate the powersync publication (the deploy does this; or run the SQL below)
```

---

## 8. Importing data

### 8.1 PocketBase backup → Postgres (the app's original data)

`scripts/import-pocketbase.sh` takes a `pb backup create` zip, boots a throwaway PocketBase over it, and runs `apps/web/src/scripts/migrate-from-pocketbase.ts` into Postgres.

```bash
# on a machine with the repo + pnpm + docker, pointing at the target Postgres:
DATABASE_URL="postgres://<user>:<pw>@localhost:5432/funds" \
  bash scripts/import-pocketbase.sh ~/backup.zip --dry      # preview first
DATABASE_URL="postgres://<user>:<pw>@localhost:5432/funds" \
  bash scripts/import-pocketbase.sh ~/backup.zip            # for real
```

Env it honors: `POCKETBASE_BIN` (binary on PATH) or `PB_DOCKER_IMAGE` (default `ghcr.io/muchobien/pocketbase:latest`), `POCKETBASE_PORT` (8099), `DATABASE_URL`.

### 8.2 Running the import on the VPS (no repo checkout there)

The runner workspace keeps a checkout + node_modules. Node 24 lives at `/home/debian/funds-runner/externals/node24/bin`.

```bash
cd /home/debian/funds-runner/_work/Funds/Funds
export PATH="/home/debian/funds-runner/externals/node24/bin:$PATH"
export PATH="$HOME/setup-pnpm/node_modules/.bin:$PATH"
PUSER=$(sed -n 's/^POSTGRES_USER=//p' infra/.env)
PPW=$(sed -n 's/^POSTGRES_PASSWORD=//p' infra/.env)
PDB=$(sed -n 's/^POSTGRES_DB=//p' infra/.env)
export DATABASE_URL="postgres://$PUSER:$PPW@localhost:5432/$PDB"
bash scripts/import-pocketbase.sh ~/backup.zip --dry
```

Requires `unzip` on the VPS (`sudo apt-get install -y unzip`).

---

## 9. Troubleshooting (hard-won, read before debugging)

### 9.1 "The host OOM'd / job cancelled mid-build"

The proxy host cannot run `next build`. That's why builds happen in pre-commit and the host only pulls. If you must build on the host anyway, free RAM first (`docker compose down`), keep `mem_limit`s, and give the build a bounded heap (`NODE_OPTIONS=--max-old-space-size=3072` in the Dockerfile). Add swap (§5.2).

### 9.2 `/sync/stream` 404

Old symptom: Cloudflare catch-all sent `/sync/stream` to the web app. Now the web app proxies it to powersync, so a single catch-all rule is enough. If you still see a 404/500, check powersync is actually running:

```bash
docker compose -f infra/docker-compose.yml logs powersync | tail -40
```

### 9.3 `password authentication failed for user "postgres"` (PowerSync)

PowerSync's pgwire parser does **not** percent-decode passwords. A password containing `&` or `%` (even URL-encoded) fails auth for powersync while node-postgres (the web app) works fine. Fix: set a URL-safe password (alphanumeric):

```bash
docker exec -it funds-postgres-1 psql -U postgres -c "ALTER USER postgres PASSWORD '<new-url-safe-pw>'"
```

then update `POSTGRES_PASSWORD`, `DATABASE_URL`, `PS_DATABASE_URL` in `infra/.env.prod`, re-set the `ENV_FILE` + `DATABASE_URL` secrets, redeploy.

### 9.4 `/sync/stream` 500 with `PSYNC_S1141` / `PSYNC_S2302`

The `powersync` publication doesn't exist. The deploy creates it `FOR ALL TABLES` idempotently; for a running stack:

```bash
docker exec funds-postgres-1 psql -U postgres -d funds -c "CREATE PUBLICATION powersync FOR ALL TABLES"
```

powersync retries replication automatically afterwards.

### 9.5 PowerSync health check fails in CI

PowerSync has **no `/health` endpoint** (404). The deploy checks the container's running state instead. Don't reintroduce a curl-to-`/health` probe.

### 9.6 `sw.js` throws during script evaluation

Serwist 9's main entry dropped `precacheAndRoute`; `src/sw.ts` imports it from `serwist/legacy`. Symptom in browser console: "ServiceWorker script at …/sw.js threw an exception". The fix is already in `src/sw.ts`. Hard-refresh / unregister the old SW once after deploy.

### 9.7 `redirect_uri_mismatch` on Google sign-in

Google OAuth redirect URI must equal `{BETTER_AUTH_URL}/api/auth/callback/google` exactly (§5.5).

### 9.8 `error: cannot perform an interactive login from a non-TTY device` (deploy step)

`GHCR_TOKEN` secret is empty at runtime (e.g. run started before the secret was set). Re-trigger the workflow.

### 9.9 `unable to find user nodejs` / `user not found`

Old worker-stub image; removed from the stack. `docker image rm` the stale `funds-worker` image if it lingers.

### 9.10 Tests fail on a fresh machine

DB tests need a throwaway Postgres on `127.0.0.1:54329` (`funds_test`). The pre-commit hook starts it automatically; standalone: `docker run -d --name funds-test-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=funds_test -p 127.0.0.1:54329:5432 postgres:16-alpine`. Test files assume seed assets exist — never run `db:clean` against a DB shared with the deployed app.

---

## 10. Docs index

| Doc | Purpose |
|---|---|
| `docs/architecture.md` | Decided stack, data model, sync design, topology, CI/CD |
| `docs/design.md` | UX/UI spec (Intaglio Plate visual language) |
| `docs/implementation.md` | Phase plan + live operational notes |
| `docs/logic.md` | Full domain rules (entities, invariants, calculations) |
| `docs/product.md` | Product brief |
| `README.md` | This manual |