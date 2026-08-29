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

## Custom sync architecture

- The client uses a **Dexie (IndexedDB) local store** (`apps/web/src/lib/sync/store.ts`)
  + a lightweight sync engine (`apps/web/src/lib/sync/engine.ts`).
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

## On-device assistant (local LLM + GenUI)

Fully client-only AI assistant using WebLLM (`@mlc-ai/web-llm`) for on-device inference.
No transaction data ever leaves the device. No network calls during inference.

### Architecture

- `lib/llm/` — LLM engine layer: `capability.ts` (WebGPU/OPFS probes), `opfs-cache.ts`
  (model weight persistence), `webllm-engine.ts` (real WebLLM wrapper), `index.ts`
  (singleton factory + mock seam).
- `lib/assistant/` — orchestrator: `chat-engine.ts` (bounded tool-calling agent loop:
  prompt → model calls a tool via WebLLM function-calling → executor runs the real
  query over local rows → widget renders; max 3 rounds, then deterministic fallback),
  `tools.ts` (tool JSON-schemas + executors — the only place money is computed),
  `period.ts` (temporal phrase → [from,to] range: "last month", snake_case tool ids),
  `schemas.ts` (Zod schemas per use case), `prompts.ts` (system + user prompts),
  `serialize.ts` (local snapshot for model context), `handlers.ts` (deterministic
  fallback via the same tool executors — model only names things).
- `components/assistant/` — React layer: `use-chat.tsx` (ChatProvider context), AssistantPanel
  (chat thread + input), AssistantButton (floating FAB), AssistantSheet (bottom-sheet
  variant), AssistantMessageView (type-switch renderer), GenUI widgets in `messages/`.
- `app/dashboard/assistant/page.tsx` — full-page route (`/dashboard/assistant`).

### Key invariants

- The agent uses **native WebLLM function-calling** (`tools`/`tool_calls` on
  `completions.create`). The model only NAMES things (tool, period, category,
  account); every money figure is re-derived by tool executors from local rows.
  First widget-shaped tool result terminates the loop.
- Money is **never** passed to the model as BigInt. It is serialized as decimal strings
  in the snapshot, and handlers re-derive it from local rows after Zod validation.
- The model never generates JSX. Each validated schema maps to a fixed React component
  via a type-discriminated switch — no dynamic code generation.
- If the model produces nothing usable (no valid tool call / widget JSON) after the
  rounds run out, the chat-engine falls back to a deterministic answer derived from
  the same local data (no broken UI, no model-reliant text).

### Device gating

- `detectSupport()` probes WebGPU, OPFS, storage quota (≥1 GB), and cross-origin
  isolation. Returns a typed `LlmSupport` discriminated union.
- Models tiered by free storage in `pickModel` (`lib/llm/capability.ts`): SmolLM2-360M (smallest), Qwen3-0.6B, Llama-3.2-1B (q4f32/q4f16). `@mlc-ai/web-llm` streams via `completions.create({ stream: true })` → chunks carry `choices[0].delta.content` — see `webllm-engine.test.ts` for the contract.
- `AssistantButton` does NOT render on truly unsupported devices. The `/dashboard/assistant`
  route renders an explanation page.

### iOS Safari specifics

- OPFS storage is best-effort — iOS may evict after ~7 days of no engagement.
- `StaleBanner` (in AssistantPanel) checks `lastLoadedAt` from an OPFS sidecar. If
  >5 days, it shows a non-blocking "Model may need redownload" notice with a refresh
  button that unloads the engine so the next send triggers a fresh load.
- Settings page shows last-loaded timestamp for debugging.

### Testing

Tests use `MockLlmEngine` (fixture-driven) — no WebGPU needed in CI.
Run: `pnpm --filter @funds/web exec vitest run src/lib/assistant/`

### iOS Safari PWA test plan (manual)

1. Open the app in Safari on an iPhone (not a home-screen PWA).
2. Navigate to Settings > Assistant — confirm capability shows "webgpu" or "wasm".
3. Open the assistant via the FAB (bottom-right floating button).
4. Send "How much did I spend on Food this month?" — verify a CategoryBarChart renders.
5. Send "Am I over budget on Dining?" — verify a BudgetProgressCard renders.
6. Send "Summarize this week" — verify a SummaryDashboardCard renders.
7. Add to home screen. Force-kill the PWA. Wait 6+ days (or fake via dev tools by
   editing the `lastLoadedAt` sidecar in OPFS to be 6 days old).
8. Reopen the PWA. Open assistant. Verify the stale redownload banner appears.
9. Tap "Refresh" on the banner. Confirm the model redownloads and subsequent queries work.