# Funds

Local-first, multi-currency personal finance tracker. Next.js (App Router) PWA + Dexie local-first store with delta sync, Postgres behind it, deployed on a single VPS behind a Cloudflare tunnel.

- **Product/UX/domain specs:** `docs/design.md`, `docs/product.md`, `docs/logic.md`
- **Architecture + stack decisions:** `docs/architecture.md`
- **Implementation plan + live operational notes:** `docs/implementation.md`

> This README is the operations manual: how to rebuild the whole stack from scratch, how a deploy works, and how to operate the running system. It is written to be verbose on purpose — follow it top to bottom on a fresh box.
>
> AI agents: read **`AGENTS.md`** first — it holds the operational gotchas (migrations, BigInt, sync schema, deploy flow) that trip up agents with no prior context.

---

## 1. Repo layout

```
apps/web          Next.js app (tRPC routes, PWA, sync engine + Dexie store, auth)
packages/core     pure logic: money, parser, recurrence, lots/cost-basis (framework-free, unit-tested)
packages/db       Drizzle schema + migrations + seeds
infra/            docker-compose.yml, .env.example (template)
ops/              deploy.sh (manual deploy), worker/ (not yet deployed)
scripts/          import-pocketbase.sh (PocketBase backup → Postgres)
docs/             architecture, design, implementation, logic, product
.githooks/        pre-commit: verification + image build/push gate
.github/workflows/ci.yml   deploy-only pipeline (self-hosted runner)
```

## 2. Architecture at a glance

```
Browser (PWA, offline-first Dexie/IndexedDB store)
   │  tRPC (/api/trpc, /api/auth, /api/voice, /api/health)
   │  push: trpc.applyMutations   pull: GET /api/sync/data?since=
   ▼
Cloudflare tunnel (cloudflared systemd service on the VPS) ── TLS, DNS
   ▼
VPS (Debian) — Docker Compose, 127.0.0.1-bound ports only:
   web        Next.js standalone (linux/amd64 image pulled from ghcr.io)
   postgres   PG16, volume `pgdata`
```

Details in `docs/architecture.md`. Key topology facts:

- All host ports bind to `127.0.0.1` only. Nothing is exposed to the internet except through cloudflared. Default: web `13000`, postgres `5432` (configurable via `WEB_HOST_PORT` in `infra/.env`).
- The app syncs through the web app itself: local Dexie store pushes writes via `trpc.applyMutations` and pulls deltas via `GET /api/sync/data?since=<ms>`. A single Cloudflare catch-all ingress rule is sufficient.
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
   down + prune → up postgres → wait → migrate (host-side) → up -d --no-build →
   health checks (web).
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

Local sync (optional): `docker compose -f infra/docker-compose.yml up -d postgres` then point dev `.env` at the local stack.

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
| `funds.kasperluna.com` | *(empty, catch-all)* | `http://localhost:13000` |

Cloudflare auto-creates the DNS record. A single catch-all rule suffices — the app syncs through the web app itself.

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
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | postgres container | |
| `DATABASE_URL` | web container (env_file) | Container-style: `postgres://…@postgres:5432/funds` |
| `WEB_HOST_PORT` | compose binding | Default 13000 |
| `DOMAIN` | (ops scripts) | `funds.kasperluna.com` |
| `PUBLIC_APP_URL` | auth.ts trustedOrigins | Full origin, e.g. `https://funds.kasperluna.com` |
| `BETTER_AUTH_URL` | auth.ts baseURL | Full origin; drives OAuth `redirect_uri` |
| `BETTER_AUTH_SECRET` | auth.ts | ≥32 chars |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | auth.ts | Google provider enabled only when both set |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | push | |
| `CRON_SECRET` | cron/webhook endpoints | |
| `COINGECKO_API_KEY` | rates refresh (future worker) | |
| `BACKEND_BASE_URL` | (unused — dead) | Kept in template |
| `APP_URL` / `CRON_AUTH` | `ops/worker` (not yet deployed) | |

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

### 9.2 Sync not updating

If pushes or pulls stop working, check the web app is healthy and reachable:

```bash
docker compose -f infra/docker-compose.yml logs -f web
curl -fsS http://localhost:13000/api/health
```

The sync path goes through the web app itself (`trpc.applyMutations` for pushes, `GET /api/sync/data` for pulls) — there is no separate sync service.

### 9.3 `password authentication failed for user "postgres"`

The password in `infra/.env`/`apps/web/.env` no longer matches the container. Reset it and update the config:

```bash
docker exec -it funds-postgres-1 psql -U postgres -c "ALTER USER postgres PASSWORD '<new-pw>'"
```

then update `POSTGRES_PASSWORD` and `DATABASE_URL` in `infra/.env.prod`, re-set the `ENV_FILE` + `DATABASE_URL` secrets, redeploy.

### 9.4 `sw.js` throws during script evaluation

Serwist 9's main entry dropped `precacheAndRoute`; `src/sw.ts` imports it from `serwist/legacy`. Symptom in browser console: "ServiceWorker script at …/sw.js threw an exception". The fix is already in `src/sw.ts`. Hard-refresh / unregister the old SW once after deploy.

### 9.5 `redirect_uri_mismatch` on Google sign-in

Google OAuth redirect URI must equal `{BETTER_AUTH_URL}/api/auth/callback/google` exactly (§5.5).

### 9.6 `error: cannot perform an interactive login from a non-TTY device` (deploy step)

`GHCR_TOKEN` secret is empty at runtime (e.g. run started before the secret was set). Re-trigger the workflow.

### 9.7 `unable to find user nodejs` / `user not found`

Old worker-stub image; removed from the stack. `docker image rm` the stale `funds-worker` image if it lingers.

### 9.8 Tests fail on a fresh machine

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