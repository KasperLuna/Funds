# Funds — Architecture & Stack Specification

Companion to `logic.md` (domain rules). This document fixes the technology decisions and system topology for the rewrite. Together, both files form the full implementation brief.

---

## 1. Decided Stack

| Layer | Decision | Notes |
|---|---|---|
| Framework | Next.js (App Router) + shadcn/ui | carried over from current stack |
| Language | TypeScript end-to-end | |
| Server DB | PostgreSQL 16+, self-hosted in Docker | `wal_level = logical` for PowerSync |
| ORM / migrations | Drizzle | SQL-native, pairs with Better Auth + tRPC ecosystem |
| API | tRPC v11 | app queries/mutations; sync transport is PowerSync's own WebSocket |
| Local client store | SQLite via WASM over OPFS (PowerSync storage adapter) | NOT raw IndexedDB (evictable on iOS) |
| Sync engine | **PowerSync, self-hosted** (open core) | buckets scoped per user; read sync automatic; writes via SDK upload queue → tRPC |
| Auth | Better Auth on Postgres | Google OAuth + email/password + guest demo account |
| PWA shell | Serwist service worker | precached app shell; offline launch on iOS/Android/desktop |
| Push | Web Push (VAPID), server cron trigger | iOS cannot schedule background pushes locally |
| Deployment | Single VPS, `docker compose up`, ingress via cloudflared tunnel (host systemd) | CI via GitHub Actions self-hosted runner |

### Non-negotiable data-integrity contract
1. Client generates all IDs (ULID, text PK) — offline creates never collide.
2. Writes land in local SQLite first, queued durably by PowerSync's CRUD upload queue until server acks.
3. Server mutations idempotent: keyed by client ULID; replay-safe.
4. Deletes are soft (`deleted_at`) on replicated tables — tombstones propagate.
5. Conflicts: per-row last-write-wins on `updated_at`, server is final authority; balance-type derived values are recomputed, never merged.
6. Every replicated row carries `user_id`, `created_at`, `updated_at`.

---

## 2. Service Topology (docker-compose)

```
cloudflared      host systemd service (not in compose); CF-managed TLS,
                   ingress rules in Zero Trust dashboard:
                    /                -> http://localhost:3000 (app)
                    /sync/*          -> http://localhost:8080 (powersync, WebSocket + HTTP)
app              Next.js standalone build (tRPC routes, webhook endpoints)
postgres         PG16, logical replication ON, single volume
powersync        PowerSync service; consumes PG logical replication slot,
                 serves per-user sync buckets
worker           long-running node process:
                   - reminder cron (planned txns -> VAPID push)
                   - voice-draft TTL cleanup
                   - CoinGecko price refresh loop
                   (node-cron inside container; no external scheduler needed)
```

Volumes: `pgdata`. Compose host ports bound to 127.0.0.1 only (cloudflared, CI health/migrate, local dev). All config via `.env` composed from a committed `.env.example`.

### CI/CD
Self-hosted runner on the VPS: build images → `docker compose pull/build` → run Drizzle migrations job → `compose up -d` → health checks (`/api/health`). Rollback = previous image tags.

---

## 3. Data Model (canonical, supersedes logic.md §3 where they differ)

Conventions:
- IDs: ULID strings, generated client-side.
- Money: `bigint` **minor units** (cents, satoshis — defined per asset `decimals`). No floats anywhere. No decimal.js.
- Time: `timestamptz`; user/scheduled timezones are IANA strings (`Asia/Manila`).
- Display currency conversion happens at read time using the rates table + per-transaction value snapshots; never at write time only.

### 3.1 assets
```
id            ULID
kind          fiat | crypto
code          ISO 4217 (fiat) or symbol (BTC)
name
coingecko_id  nullable (crypto)
decimals      int — minor-unit exponent (USD=2, BTC=8)
```

### 3.2 accounts  (replaces Bank)
```
id, user_id
name                      unique per user, case-insensitive
kind                      bank | cash | wallet | exchange
asset_id                  native asset of this account
opening_balance_minor     bigint (in asset minor units)
colors                    optional cosmetic pair
archived                  bool
```
Balance rule: transactions are sole truth; balance = opening + Σ amounts (derived, cached view allowed). No mutable stored balance column — deletes/edits can never drift.

### 3.3 categories
As logic.md §3.3 minus `total_exempt` (transfers now structurally excluded via linked legs — flag deleted). Keeps `hideable`, `monthly_budget_minor`.

### 3.4 transactions
```
id, user_id
account_id
asset_id            denormalized from account for query speed
amount_minor        bigint SIGNED (expense < 0, income > 0)
type                income | expense   (deposit/withdrawal collapsed away)
description
category_ids        0..n
date
value_base_minor    nullable snapshot: value in user base asset at write time
trade_id            nullable ref -> trades (when this txn is one leg)
transfer_id         nullable ref -> transfers (same-asset linked legs)
deleted_at
```

### 3.5 transfers (same-asset moves between own accounts)
```
id, user_id, legs: two transaction refs, fee txn optional
```
Analytics rule: both legs excluded from category-spend aggregates structurally (replaces old `total_exempt`).

### 3.6 trades (cross-asset exchanges, incl. crypto buys/sells via any account)
```
id, user_id
sell_leg    txn ref (account A, asset X, negative)
buy_leg     txn ref (account B, asset Y, positive)   — B may equal A
fee_leg     optional txn (asset Z, negative)
rate        buy.amount / sell.amount (derived, stored for display)
note
```
Buying BTC with USD from a bank = Trade. Selling = Trade. Realized P/L computed from sell leg vs average cost basis at that moment.

### 3.7 holdings_lots (source of truth for crypto math)
Derived view over trade buy/sell legs (or explicit lot rows materialized by worker): enables average-cost method and realized/unrealized P/L per asset. Logic identical to logic.md §10 but expressed as ledger queries, not a parallel entity family. `tokens` and `token_transactions` entities do not exist.

### 3.8 scheduled_transactions (was PlannedTransaction) + templates (was isTemplate=true rows)
Split entities:
```
templates               name, type, amount_minor, description, account, category_ids
scheduled_transactions  template-ish fields + recurrence {frequency, interval},
                        invoke_date, previous_date, timezone IANA,
                        last_notified_at, active
```
Advancement/waive/reminders behave exactly per logic.md §8, computed with IANA zone conversions.

### 3.9 users / auth (Better Auth tables)
Standard Better Auth schema + `base_asset_id` (display currency), `timezone`, hashed `voice_api_key`.

### 3.10 push_subscriptions, voice_drafts
Unchanged semantics from logic.md §3.9–3.10. Voice drafts keep 5-min TTL.

### 3.11 rates (worker-managed)
```
asset_id, vs_base_asset_id, price_minor_scaled, fetched_at
+ retained history rows for historical valuation
```

---

## 4. Sync Design

- Sync rules: one bucket stream per user containing all rows where `user_id = jwt.user_id`. Small dataset — full-user replication, no pagination complexity.
- Reads: tRPC bypassed for replicated data; components query local SQLite directly (live queries). tRPC reserved for: uploads, auth, voice webhook, price refresh triggers, push test, non-replicated concerns.
- Upload path: PowerSync client upload queue → batched tRPC mutation endpoint → Postgres → logical replication → fan-out to devices.
- Offline behavior: full CRUD works locally forever; queue drains when online. App launches offline from precached shell + local DB.
- Analytics (budgets, trends, monthly breakdowns, net worth): SQL views / live queries over local SQLite only — zero network dependency (per D9).

---

## 5. Voice Pipeline (per D10)

- Parser extracted into shared package (pure, deterministic — spec in logic.md §9.1 unchanged).
- In-PWA path: shortcut/share-target/deep-link hands raw text to PWA → parser runs client-side against locally-synced account/category names → prefilled draft form instantly, even offline.
- External webhook path (unchanged UX): POST text + Bearer voiceApiKey → server parses with the same shared package → ephemeral voice_draft row → phone redeems by token within TTL.
- Key stored hashed; lookup by hash.

---

## 6. Reminders & Worker (per D11)

- Worker container runs reminder cron: due-today check per scheduled txn using its IANA timezone; dedupe window 3h/day per logic.md §8.4; sends VAPID pushes to all subscriptions; batch-acks `last_notified_at` via Postgres directly (replicates out to clients).
- Also owns: expired voice-draft cleanup, CoinGecko refresh (respecting rate limits), rates history retention.
- Deep link `?scheduledId=` opens prefilled log dialog exactly as before.

---

## 7. Crypto Feature Scope (per D6/D13)

1. Unified ledger: exchange/wallet accounts alongside banks; trades first-class.
2. Average-cost basis recompute on every lot event (buy/sell/trade/delete).
3. Realized P/L recorded per sell; unrealized = holdings × live rate − cost basis.
4. Net worth: all accounts valued in base asset (fiat direct, crypto × rate).
5. Historical valuation uses stored `value_base_minor` snapshots, not current rates.
6. Price fetch: CoinGecko markets API, batched by distinct coingecko_ids, cached ~24h, 429-aware no-retry (logic.md §10 preserved).

---

## 8. Migration Notes From Current System

- One-shot import script (PB → PG): collapse deposit/withdrawal, negate sign conventions already match, synthesize assets/accounts from banks, convert hour-offset timezones to nearest IANA zone, mint ULIDs, seed rates history from CoinGecko.
- Old Firebase env block dropped; web-push keys carried over.

## 9. Explicit Non-Decisions (deferred)

- Tax-lot methods beyond average-cost (D13b) — out of scope.
- Multi-user sharing/joint accounts — out of scope.
- Native apps — PWA only.
