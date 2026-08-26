# AGENTS.md

Operational context for AI agents working in this repo. Read this first — it
contains the hard-won gotchas that 0-context agents trip over. Deep references:
`README.md` (ops manual), `docs/architecture.md`, `docs/logic.md`.

## Commands (run from repo root)

```bash
pnpm run lint        # all packages
pnpm run typecheck
pnpm run test        # core + db + web (db needs the throwaway PG on :54329)
pnpm run db:check    # schema drift check: live DB vs schema.ts (MUST pass)
pnpm run db:migrate  # applies drizzle migrations (self-heals untracked DBs)
```

Never merge a schema change without running `db:check` against a migrated DB.

## The deploy model (why things are the way they are)

- The VPS OOMs under `next build`, so **nothing builds on the host**.
- The `.githooks/pre-commit` hook (enabled via `git config core.hooksPath .githooks`)
  is the real build gate: lint → typecheck → test → `db:check` → docker buildx
  `--push` to `ghcr.io/kasperluna/funds-web:latest`. Skip the slow image build with
  `SKIP_DOCKER_PUSH=1 git commit` (still runs lint/typecheck/test/check).
- **When to skip the image build** (commit/push convention):
  - Single commit → never skip; let the hook build+push.
  - Multiple commits → `SKIP_DOCKER_PUSH=1` on intermediates, and make the LAST
    commit without the flag so exactly one image build+push covers the batch,
    then push to trigger the deploy CI.
  - Never end a work session with unpushed commits that skipped the build —
    prod pulls `:latest` only from the hook's push or a manual equivalent.
- `.github/workflows/ci.yml` (self-hosted runner) is deploy-only: pulls the image,
  runs `migrate` then `db:check` against prod Postgres, restarts the stack.
- **If the pre-commit image build or a CI step fails, production is silently
  stuck on the last good image.** A failed deploy does NOT roll forward.

## Database migrations — THE #1 gotcha

- The prod (and local) DB was created **out-of-band** (drizzle-kit push / legacy
  pocketbase import): it has the schema but **no `drizzle.__drizzle_migrations`
  tracking table**.
- Drizzle's migrator replays every migration in order and dies on the first
  `relation ... already exists`. Before the self-heal fix, `pnpm migrate` aborted
  on `0000` and **never applied anything new** — the `color` column incident.
- `packages/db/src/migrate.ts` now self-heals: if the schema exists but tracking
  is empty, it baselines all journal migrations and applies only new ones, then
  reconciles known gaps idempotently.
- **Adding a column to `schema.ts` is NOT enough.** A replicated table change
  requires ALL of these in sync, or sync/uploads break:
  1. `packages/db/src/schema.ts` (Drizzle) — the source of truth.
  2. `pnpm --filter @funds/db exec drizzle-kit generate` → new `packages/db/drizzle/000X_*.sql`.
  3. `apps/web/src/lib/sync/normalize.ts` — only if the column is jsonb / timestamp /
     non-text, or a money column (MONEY_COLUMNS) whose string→BigInt read boundary must change.
  4. `apps/web/src/server/table-registry.ts` — snake_case↔camelCase field mappers.
- Then apply: `pnpm run db:migrate` and verify with `pnpm run db:check`.
- Never ship code that writes a column the DB lacks: a category write with an
  unknown `color` aborts the whole `applyMutations` transaction and deadlocks
  sync uploads.

## Money = BigInt, always

- `amount_minor` / `*_minor` columns are **signed BigInt** (minor units, not floats).
  Expense < 0, income > 0. There is an eslint rule `local/no-money-float`; display
  formatting only, never float arithmetic.
- **In the Dexie store money is stored as strings** and materialized as JS `BigInt`
  at the read boundary (`apps/web/src/lib/sync/normalize.ts`). The read boundary
  (`BigInt(...)` on the string, wrapped in `Number(...)` where math is needed) is
  where you harden: BigInts reaching `Math.*`, `new Date(bigint)`, `10 ** bigint`,
  `.toFixed`, or `+bigint` throw `can't convert BigInt to number` and crash the page.
- Harden boundaries: `new Date(Number(ts))`, `10 ** Number(decimals)`, wrap
  `BigInt(Math.round(Number(x) * Number(y)))`. `formatMoney` already does this —
  keep it that way.

## Soft-delete + archive semantics

- Deletes are soft everywhere: `deleted_at` timestamp tombstone. Queries filter
  `WHERE deleted_at IS NULL`. Transactions of a deleted account get tombstones too.
- **Archive is NOT delete**: `accounts.archived` boolean. Archive hides the account
  from active queries (`archived = 0`) without tombstoning its transactions. Active
  account queries MUST include `AND archived = 0`.
- Delete is only offered for archived accounts (type-in name confirmation); archive
  has its own confirmation dialog (`apps/web/src/components/banks/bank-confirm-dialogs.tsx`).
- Category `color` is a persisted column; reads fall back to `categoryColor(name)`
  when null (`resolveCategoryColor`). Tagged-transaction chips use `cat.color`.

## Service worker / PWA staleness

- `apps/web/src/sw.ts`: navigation is network-first, same-origin assets are
  stale-while-revalidate. Do NOT revert to cache-first-without-revalidation — that
  pinned clients on stale bundles (crashes + React #418 hydration mismatch).
- After a deploy, clients pick up fresh code on next navigation (SW updates with
  `skipWaiting`). The `file://` security error users saw was a broken old SW install.

## Testing conventions

- vitest. `@vitest-environment jsdom` for components. Mock the sync layer:
  `vi.mock("@/lib/sync/sync-context")` → `useSync` returns a db whose `query`
  resolves rows per table (see `apps/web/src/app/dashboard/categories/categories.test.tsx`).
- db tests (`packages/db/src/schema.test.ts`) run `migrate` against
  `postgres://postgres:postgres@localhost:54329/funds_test` — the throwaway PG
  the pre-commit hook spins up. `funds-test-pg` container, port 54329.
- Component tests stub `ResizeObserver` (jsdom lacks it) for radix primitives.

## Local dev environment

- Local Postgres: docker `funds-postgres-1` (127.0.0.1:5432, db `funds`). Real user
  data lives here (it's a working mirror) — don't truncate.
- Test PG: docker `funds-test-pg` (127.0.0.1:54329, db `funds_test`).
- `apps/web/.env` drives the dev server; `DATABASE_URL` points at the local stack.
- Guest/demo account: `demo@funds.local`.

## Custom sync architecture (no PowerSync)

- The client uses a **Dexie (IndexedDB) local store** (`apps/web/src/lib/sync/store.ts`)
  + a lightweight sync engine (`apps/web/src/lib/sync/engine.ts`). There is NO
  PowerSync service, NO `/api/sync/token`, NO `/sync/stream` proxy, and NO
  `POWER_SYNC_*` / `PS_*` env vars. Do not reintroduce them.
- **Push**: writes land in the Dexie outbox; the engine drains it via
  `trpc.applyMutations` (idempotent, per-row savepoints). **Pull**: `GET
  /api/sync/data?since=<ms>` returns deltas since the server-echoed watermark,
  applied locally and advancing the watermark.
- Sync cadence: every 30s on a visible tab plus `online`/`pageshow`/`visibility`
  triggers. Soft-deletes propagate on a monotonic watermark.
- Money is a **string in the store**, materialized as **BigInt at the read
  boundary** (`normalize.ts`). Harden the boundary (see Money section).
- Signed-out renders an in-memory store; signed-out wipes the Dexie store
  (leak-safety).
- Analytics run over a **mini SQL engine** (`sql.ts`) supporting only the query
  shapes in use — keep new queries within those shapes.

## Repo conventions

- No comments unless they encode a `cavetail:` decision or a lint-exemption reason.
- Client generates all IDs (ULID, text PK) — offline creates never collide.
- Keep the PWA offline-first contract: writes land in the local Dexie store first, sync
  uploads after. Never gate writes on the server.