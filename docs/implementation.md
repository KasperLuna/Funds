# Funds — Implementation Plan

Execution order for the rewrite. Sources of truth: `logic.md` (domain rules), `architecture.md` (stack/topology), `design.md` (UX). This file defines phases, deliverables, and acceptance gates. Phases are vertical slices — each ends `docker compose up`-deployable and demoable.

> **Status 2026-08-24:** Phases 1–4 are live in production (VPS + cloudflared + sync working end-to-end). Phases 5–14 are the forward roadmap. Phase 1's deliverable changed mid-flight: the VPS is also a proxy and OOMs under a heavy `next build`, so the build was moved off-host (see Phase 1 notes). PowerSync was since removed in favor of a Dexie local-first store + custom delta-sync engine.

---

## 0. Ground Rules

1. **Schema-first**: no feature code before Drizzle schema + migrations are frozen for that slice's entities.
2. **Capture-first**: the "log a transaction offline" path is built before any analytics/reporting exists.
3. **Pure logic isolated**: money math, parser, recurrence advancement, cost-basis live in framework-free modules with unit tests (`src/core/*`). UI never reimplements them.
4. **Every phase ships**: green health check on VPS after merge.
5. Money = integers only in app code; conversion helpers in `src/core/money.ts`; lint rule banning raw float arithmetic on amounts.

Repo layout target:
```
apps/web        Next.js app (+ tRPC, PWA)
packages/core   pure logic (money, parser, recurrence, lots/cost-basis)
packages/db     Drizzle schema + migrations + seeds
infra           docker-compose*, .env.example
ops             deploy scripts (worker package: not yet deployed)
scripts         operational scripts (import-pocketbase.sh)
docs/           architecture.md, design.md, implementation.md, logic.md, product.md
.githooks/      pre-commit (verification + image build/push gate)
```

---

## Phase 1 — Infra Skeleton
Deliverables:
- `docker-compose.yml`: postgres, web (Next standalone). Host ports `127.0.0.1`-only, memory-capped (`mem_limit`) so a runaway container restarts instead of OOM-ing the proxy host.
- cloudflared on host (systemd, token-managed): TLS + routing. Catch-all → `$WEB_HOST_PORT` (default 13000). `.env.example` complete (VAPID keys, secrets, DB URL, OAuth creds).
- GH Actions (self-hosted runner) is **deploy-only**: it never builds. Images are built + pushed to GHCR by `.githooks/pre-commit` on the developer machine (linux/amd64). The runner pulls, migrates, and health-checks.
Gate: fresh VPS boots whole stack with one command; rollback tag works.

## Phase 1b — Deploy plumbing (realized 2026-08-24)
Hard-won operational knowledge; see README.md §Deploy for the full picture.
- **Builds off the host**: pre-commit runs lint/typecheck/test + `docker buildx build --platform linux/amd64 --push` to GHCR. Skip the slow build with `SKIP_DOCKER_PUSH=1 git commit`.
- **The Postgres password must be URL-safe** (alphanumeric) when it is embedded in a connection URL; keep it alphanumeric so `DATABASE_URL` works everywhere.

## Phase 2 — Data Layer
Deliverables:
- Full Drizzle schema (architecture.md §3): assets, accounts, categories, transactions, transfers, trades, templates, scheduled_transactions, users/auth tables, push_subscriptions, voice_drafts, rates(+history). ULID PKs, `user_id/created_at/updated_at/deleted_at` conventions, minor-unit bigints.
- Migration pipeline + seed script (assets incl. fiat set from currencies.json + top cryptos; demo user fixture).
- `src/core/money.ts` (format/parse/convert w/ asset decimals), `ulid.ts`.
Tests: schema round-trip, money helpers property tests.
Gate: `pnpm db:migrate && db:seed` idempotent.

## Phase 3 — Auth
Better Auth on PG: email/password, Google OAuth, **guest demo** (seeded demo dataset, banner "reset demo", rate-limited). Session cookie config for PWA standalone. Sign-out clears local DB too.
Gate: three flows work on deployed HTTPS domain; guest→signup upgrades same device cleanly.

## Phase 4 — Sync Backbone
Deliverables:
- Dexie (IndexedDB) local store (`lib/sync/store.ts`) + sync engine (`lib/sync/engine.ts`); money stored as strings, materialized as BigInt at read boundary.
- Sync rules: per-user rows over all replicated tables; full-user delta sync, no pagination complexity.
- Pull: `GET /api/sync/data?since=<ms>` (server `apps/web/src/server/sync-data.ts` + `sync-serialize.ts`) returns deltas since the server-echoed watermark; 30s visible-tab pull + `online`/`pageshow`/`visibility` triggers.
- Push: outbox drain via batched tRPC `applyMutations` endpoint (idempotent by ULID, soft-delete aware, LWW on `updated_at`, server-authoritative). Signed-out wipes the Dexie store.
- Sync pill component + pending-queue detail sheet (design.md §6).
Integrity tests (must-pass suite, reused every later phase): write-offline→kill app→relaunch→syncs; concurrent edit two devices (LWW verified); delete vs update race; replay duplicate mutation (no double effect); schema migration while queue non-empty.
Gate: airplane-mode CRUD round-trip on real phone.

## Phase 5 — Capture Sheet (the product)
Deliverables:
- Bottom-sheet/dialog shell (responsive per design.md §4), custom keypad component (haptics, per-asset decimals, disabled-reason states), context strip (account chip + date chip with Today/Yesterday presets and a full calendar via `react-day-picker`), type toggle.
- Templates nested behind a `[Templates ▾]` chip (2-tap apply; active template shows a check) instead of an inline chip row; suggestions sit below the hero and set type from the sign (negative → expense, positive → income).
- Save path: local insert → optimistic dismiss → undo toast (compensating mutation pre-sync).
- Suggestions engine v1: due-today scheduled txns (one-tap log + advance recurrence per logic.md §8.3) + recent repeats query.
- Add mini-menu via the mobile `＋` caret cap and desktop sidebar split-Add caret (Expense · Income · Transfer · Trade); no long-press.
Unit tests: amount parsing/clamping per decimals; undo correctness.
Gate: **north-star met** — cold open → logged ≤5s / ≤3 interactions, measured on mid-tier Android, offline.

## Phase 6 — Banks & Transactions List
Grouped-by-day virtualized list, swipe actions (duplicate/delete/edit via capture sheet), day sticky headers, account pills header, "This month" stat strip (labeled, privacy-maskable), **sticky filter bar** (full-text search across description/category/account · category multi-select popover · date-range popover with a calendar), table view ≥lg. Mobile hides the redundant Add-transaction button (footer `＋` covers it). Balance adjustment (reconcile) per logic.md §4.4 lives on the AccountCard as "Adjust balance" → dedicated sheet that posts a single income/expense for the delta.
Gate: 10k-row scroll 60fps; swipe+undo suite passes.

## Phase 7 — Accounts, Categories, Transfers
CRUD surfaces for accounts (kind/asset/colors/archive) + categories (budget/hideable); transfer variant of capture sheet (linked legs, fee disclosure); deletion cascades per logic.md §6/§5.5 implemented as server-side transactional logic.
Gate: transfer renders correctly in both account histories and net worth once.

## Phase 8 — Crypto & Rates
Worker: CoinGecko refresh loop (batch ids, ~24h cache, 429-aware), rates + history tables. Trade capture variant (legs + rate preview + fee). Holdings view: qty/avg-cost/value/24h/unrealized; realized P/L rows. Cost-basis engine in `core/lots.ts` (average-cost per logic.md §10, now ledger-driven).
Gate: buy→sell cycle shows correct realized P/L; offline trade queues cleanly.

## Phase 9 — Scheduled Transactions & Reminders
Templates + scheduled entities UI; advancement/waive flows (already wired in capture suggestions); worker reminder cron (IANA-timezone due-today check, 3h dedupe, VAPID send, batch ack); deep-link prefill; push subscription upsert/remove UI + test-send.
Card is a glance surface: shows only active items coming up within 3 days (nearest first, overdue included); the rest hide behind a "N more scheduled" expander (`partitionSchedules` in `lib/scheduled/compute.ts`). On mobile, Pause/Edit/Delete collapse into a kebab menu; Confirm stays inline. Row = name+meta on the left, amount + status chip + Confirm + actions on the right (all on one line).
Gate: reminder arrives on phone at due time in correct timezone; waive advances without creating txn.

## Phase 10 — Voice Pipeline
Extract parser verbatim into `packages/core/parser` (+ port existing tests if none exist, write golden-file tests first from current behavior). In-PWA path: shortcut/share-target/deep-link → parse against local accounts/categories → prefilled sheet. Webhook path: Bearer hashed-key endpoint reuses same package → ephemeral voice_draft → redemption poller → prefilled sheet. Worker TTL cleanup.
Gate: same input text produces identical parse output old vs new (diff harness).

## Phase 11 — Analytics & Home Hub
Local SQL views: monthly aggregates w/ proportional split + exempt-free transfers (logic.md §5), budgets thresholds, trends (% change math §11.2), volatile flagging, net-worth hero w/ freshness stamp. Home hub layout per design.md §8.1. Charts themed centrally.
Gate: numbers match current production app within rounding tolerance on migrated sample data.

## Phase 12 — PWA Hardening & Onboarding
Serwist precache/runtime strategy, offline-launch audit checklist, install nudge, storage-persist + low-storage warning, iOS standalone quirks (16px inputs, safe areas), onboarding checklist flow (logic.md §14) + contextual push prompt.
Gate: Lighthouse PWA ✓; iPhone airplane-mode cold launch usable.

## Phase 13 — Data Migration & Cutover
One-shot importer script (architecture.md §8): PB → PG transforms (type collapse, sign normalization, hour-offset→IANA mapping, ULID minting, rates backfill, crypto unification into trades/lots). Dry-run report + diff validation vs old app totals. Feature-flagged dual-run optional week.
Gate: migrated user sees identical balances/net worth both apps.

## Phase 14 — Visual Polish Pass
Token sweep replacing bespoke gradients (design.md §9), contrast fixes (slate-400 floor), focus rings, motion audit, empty/loading standardization, chart theme unification.
Also landed during polish:
- **Desktop sidebar** redesigned to the §3.2 order: Account → Visibility → Add group → Navigation → (space) → Funds logo (small, centered, links `/`) → Settings → Sign out. `UserCard` no longer embeds its own Sign-out (settings page supplies it separately).
- **Privacy masking** default-on across all money figures (net worth, Banks total + "This month", budget pulse, categories, crypto) with percentages always visible (§10).
- **Landing footer**: "by KasperLuna" wordmark link (→ kasperluna.com) mirroring bridge-reborn, bottom-anchored on the base route.
- New UI primitives: `Popover` (Radix) and `Calendar` (react-day-picker) — hairlined Intaglio plates.
Gate: design.md a11y checklist green; visual regression screenshots approved.

---

## Dependency Graph

```
P1 ─ P2 ─ P3 ─ P4 ─ P5 ─ P6 ─ P7 ─ P8 ─ P9 ─ P10
                      └─ P11 ─────────┘ (views can build on P6 data)
P12 spans P5→end (shell exists from P1, hardened late)
P13/P14 last, parallelizable
```

## Cross-Cutting Test Strategy
- `packages/core`: Vitest unit + property (money, parser goldens, recurrence, lots).
- Sync integrity: dedicated Playwright suite running the P4 scenario list against every release.
- E2E happy paths: signup→onboard→capture→list→trade→reminder.
- Perf gates: capture-open ≤100ms, list 60fps, launch budget (design.md §11) asserted in CI via traces on runner device profile.

## Risk Register (top items)
| Risk | Mitigation |
|---|---|
| Custom sync engine edge cases | P4 integrity suite first; keep sync isolated behind the engine/store modules |
| IndexedDB eviction on iOS | persist() request + low-storage UX (design.md §10); test on real devices early |
| Parser regressions | golden files frozen from legacy before touching it |
| BigInt/minor-unit leaks into UI | lint rule + money helper escape hatch review |
| Scope creep in analytics | views replicate legacy formulas exactly; enhancements post-cutover |
