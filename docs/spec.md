# Funds — Product Specification

> Business logic and data contracts for the Funds personal-finance app.
> Deliberately free of implementation details (UI components, hooks, query params).
> All facts below were extracted from the current codebase.

## 1. Overview

Funds is a personal finance tracker PWA. It lets a user:

- Track transactions across multiple bank accounts, with categories
- Set monthly budgets per category and monitor usage
- Schedule recurring planned transactions (rent, subscriptions) with push reminders
- Track a crypto portfolio against live CoinGecko market prices
- Capture expenses by voice (Siri Shortcut → webhook → prefilled transaction draft)
- Mask all amounts with a session-level privacy mode

Data lives in PocketBase, one record set per user. The app is single-currency per
user; every number is stored as a plain (non-decimal) float and arithmetic uses
high-precision decimals.

## 2. Data contracts

### 2.1 Conventions

| Rule | Value |
|---|---|
| Money | `number`; amounts are **signed** — `expense`/`withdrawal` stored negative, `income`/`deposit` positive |
| Bank balance | always equals the sum of its transactions' signed amounts (see §3.3) |
| Dates | ISO-8601 UTC strings; day/month comparisons done in the user's timezone |
| Timezone | stored as UTC offset in **hours** (e.g. `+8`, `-5`) |
| IDs | PocketBase record IDs; relations stored as ID strings |
| Precision | decimal arithmetic everywhere; display truncates to 2 decimals |

### 2.2 Collections

#### `users`

| Field | Type | Notes |
|---|---|---|
| `email`, `username` | string | auth identity |
| `verified` | bool | |
| `currency` | string | ISO code (`USD` default), stored on user |
| `voiceApiKey` | string | 48 hex chars (24 random bytes). Bearer credential for the voice webhook. Empty/absent = revoked. |

#### `banks`

| Field | Type | Notes |
|---|---|---|
| `name` | string | unique per user (case-insensitive) |
| `balance` | number | signed; Σ of the bank's transaction amounts (§3.3) |
| `primaryColor` / `secondaryColor` | string? | display only |

#### `categories`

| Field | Type | Notes |
|---|---|---|
| `name` | string | |
| `hideable` | bool | "privacy hidden": transactions in this category are hidden while privacy mode is on |
| `total_exempt` | bool | "exclude from totals": category is ignored in income/expense breakdown totals, but still counted in overall balance |
| `monthly_budget` | number? | positive cap; unset = no budget |

#### `transactions`

| Field | Type | Notes |
|---|---|---|
| `description` | string | |
| `type` | enum | `income` \| `expense` \| `deposit` \| `withdrawal`. Sign: income/deposit +, expense/withdrawal − |
| `amount` | number | signed, per the type |
| `bank` | relation → `banks` | exactly one |
| `categories` | relation[] → `categories` | zero or more; a transaction can span categories |
| `date` | string | parseable date, stored UTC |

`deposit`/`withdrawal` are accepted but the UI normalizes them to income/expense
on entry; editing always resolves to income/expense.

#### `tokens` (crypto holdings)

| Field | Type | Notes |
|---|---|---|
| `name`, `symbol` | string | display |
| `coingecko_id` | string | key for market data |
| `total` | number | current quantity held — **derived**, see §3.5 |
| `costAvg` | number | average cost basis per unit — **derived** |

#### `token_transactions` (crypto ledger)

| Field | Type | Notes |
|---|---|---|
| `token` | relation → `tokens` | |
| `type` | enum | `buy` \| `sell` |
| `amount` | number | quantity; must be > 0 |
| `price` | number | price per unit; ≥ 0 |
| `total_cost` | number | `amount × price`, computed at creation |
| `date` | string | |
| `note` | string? | |

`total` and `costAvg` are recomputed from this ledger on every change (§3.5).

#### `planned_transactions`

One collection for two concepts: **planned transactions** (recurring, scheduled)
and **templates** (static prefills).

| Field | Type | Notes |
|---|---|---|
| `name` | string? | template display name (templates only) |
| `description` | string | transaction description |
| `type` | enum | same as transactions; amount stored signed |
| `amount` | number | signed per type |
| `bank` | relation → `banks` | |
| `categories` | relation[] → `categories` | |
| `recurrence` | object? | `{ frequency: daily\|weekly\|monthly\|yearly, interval: int ≥ 1 }`; absent for templates |
| `timezone` | int? | UTC offset in hours; absent for templates |
| `invokeDate` | datetime? | next scheduled occurrence (UTC); null for templates |
| `previousDate` | datetime? | last occurrence that was logged; null until first log |
| `lastNotifiedAt` | datetime? | last push reminder sent (UTC) |
| `active` | bool | default true; only active planned transactions schedule/notify |
| `isTemplate` | bool | `true` = template, `false`/absent = planned transaction |

#### `push_subscriptions`

| Field | Type | Notes |
|---|---|---|
| `user` | relation → `users` | |
| `endpoint` | string | Web Push endpoint; unique per (user, endpoint) |
| `keys` | object | `{ p256dh, auth }` |

#### `voice_drafts`

| Field | Type | Notes |
|---|---|---|
| `token` | string | UUID; capability credential (fetch by token, no auth) |
| `preview` | string | JSON-encoded parse result |
| `source` | string | `shortcut` (Siri) or `voice` |
| `user` | relation → `users` | nullable |
| `createdAt` | datetime | |
| `expiresAt` | datetime | `createdAt + 300 s` TTL |

#### `transactions_trends` (view)

Server-side derived per-user view; one row per month:

| Field | Type | Notes |
|---|---|---|
| `year` | int | |
| `month` | string | 1-based month as string (`"1"`…`"12"`) |
| `monthly_total` | number | net amount for the month (signed) |
| `overall_user_balance` | number | user's total balance at that point |

## 3. Business logic

### 3.1 Transaction entry modes

| Mode | Behavior |
|---|---|
| **Transaction** | One income or expense record. |
| **Transfer** | Moves money between banks: creates an `expense` at the origin bank and an `income` at the destination bank. Origin ≠ destination required. By default both sides are the same amount; "transfer different amounts" mode allows a separate destination amount. |
| **Difference** | Balance correction: user enters the bank's new observed balance; a transaction is created for `newBalance − currentBalance` (positive → income, negative → expense, magnitude stored). |

Forms accept positive magnitudes; the signed amount is derived from the type.

### 3.2 Balance maintenance

Every create/update/delete of a transaction updates the affected bank's `balance`
in the same batch as the transaction write:

- **Create:** `bank.balance += txn.amount`
- **Update (same bank):** `bank.balance += txn.amount − oldAmount`
- **Update (bank changed):** reverse `oldAmount` on the old bank, add `newAmount` on the new bank
- **Delete:** `bank.balance −= txn.amount`
- **Duplicate:** creates a copy and adds its amount to the bank

`balance` can therefore drift from the transaction sum only if writes partially
fail; a recompute operation re-derives it as the plain sum of the bank's signed
transaction amounts (floating-point noise near integers is floored).

### 3.3 Cascading deletes

- **Delete bank:** deletes all transactions of that bank, then the bank itself.
- **Delete category:** strips the category ID from every transaction that uses
  it (transactions keep their remaining categories), then deletes the category.

### 3.4 Budgets

- `monthly_budget` is a positive cap per category, edited with debounced saves.
- **Spent** per category for a month = Σ over that month's transactions of
  `amount / categories.length` (proportional split; a 2-category transaction
  contributes half to each). Spend is always displayed as a positive magnitude.
- **Remaining** = `budget − spent`. Over budget when negative.
- **Status thresholds:** < 80% used → healthy; 80–100% → near limit; > 100% → over.
- Unbudgeted categories are tracked separately; monthly totals aggregate only
  budgeted categories.

### 3.5 Crypto portfolio

Holdings are a **ledger**, not a stored position:

- **Buy:** `totalCost += amount × price`, `totalAmount += amount`
- **Sell:** `costPerUnit = totalCost / totalAmount` (while holdings > 0),
  `totalCost −= costPerUnit × amount`, `totalAmount −= amount`
- After replaying the ledger in date order: `total = max(totalAmount, 0)`,
  `costAvg = totalAmount > 0 ? totalCost / totalAmount : 0`

Rules:

- Recalculation runs after every ledger add/delete (sell-before-buy is clamped to 0 holdings)
- A token can only be deleted when its ledger is empty
- Live prices come from CoinGecko `coins/markets` keyed by `coingecko_id`,
  quoted in the user's currency; portfolio value = Σ `total × current_price`;
  portfolio 24h change is the market 24h % weighted by position value
- A token is added with `total: 0`, `costAvg: 0`

### 3.6 Planned transactions and reminders

**Scheduling.** A planned transaction carries `invokeDate` (next due) and
`previousDate` (last logged). Logging it as a real transaction (from the
"upcoming" list or the reminder deep link) advances it:

| Frequency | Next `invokeDate` |
|---|---|
| daily | + `interval` days |
| weekly | + `7 × interval` days |
| monthly | + `interval` months |
| yearly | + `interval` years |

`previousDate` becomes the old `invokeDate`. The transaction is created as a
normal signed transaction; the planned record is *not* deleted.

**Upcoming window** (shown without "view all"): `active` AND `invokeDate` within
the next 2 days (end of day) AND (`previousDate` is null or in the past).

**Reminders** (cron, authenticated by shared secret). A push is sent when *all*
hold:

1. planned transaction is `active` and has an `invokeDate`
2. its local-day (user's timezone) equals today
3. the invoke time has passed (local now ≥ local invoke time)
4. not already notified today, or last notification older than 3 hours
   (throttle, user-local time)

The notification is sent to every `push_subscriptions` record of the user:
title `Log Now: <description> due today!`, URL deep link to the dashboard with
the planned transaction id (opens the prefilled log dialog). TTL 1 hour.
`lastNotifiedAt` is stamped once at least one subscription receives it.

**Templates** (`isTemplate: true`) carry no recurrence or schedule; they prefill
the transaction form (bank, type, amount, description, categories).

### 3.7 Voice capture pipeline

1. User generates a `voiceApiKey` (48 hex chars) in account settings; a Siri
   Shortcut POSTs captured speech text to the voice webhook with
   `Authorization: Bearer <voiceApiKey>` and body `{ "text": "..." }`.
2. The server resolves the key to a user, loads that user's bank and category
   names, and parses the text:

   | Signal | Rule |
   |---|---|
   | Amount | first numeric token, optional `$ € £` / `USD EUR GBP` prefix; decimal comma supported |
   | Account | tokenized Jaccard + Levenshtein match against bank names; subsumption demotion (a match whose token window is a strict contiguous sub-window of a better match is zeroed, e.g. "cash" ⊂ "gcash wallet"); accepted at score ≥ 0.5 |
   | Category | same matching, accepted at score ≥ 0.4; multiple categories may match |
   | Description | raw text minus amount, account, and matched category tokens |
   | Confidence | 0.5 base + 0.3 (amount) + 0.1 (account) + 0.1 (category), capped at 1.0 |

3. The parse result is stored as a `voice_draft` with a 5-minute TTL; the webhook
   returns the draft token.
4. The app fetches the draft by token (`/api/voice-draft?token=…`, token is the
   capability; no other auth), opens the transaction dialog prefilled from the
   parse result — description prefixed with a mic marker, default `expense`,
   bank/category resolved by name (exact match, then substring) — and the user
   confirms or edits before saving.
5. Drafts expire server-side; an expired draft is deleted on access; a cleanup
   cron deletes expired drafts; the client drops drafts within ~15 s of expiry.

### 3.8 Privacy and currency

- **Privacy mode** is session-scoped (resets each browser session) and defaults
  to **on**: every amount in the UI is masked until toggled off.
- **`hideable` categories** are additionally hidden from lists while privacy is on.
- **`total_exempt` categories** are excluded from income/expense breakdown
  totals (their transactions are still counted in overall balance).
- **Currency** is per-user; all amounts are displayed in it (market data is
  quoted in it too).

### 3.9 Insights and breakdowns

- **Monthly breakdown (categories):** proportional split (§3.4). Exempt
  transactions excluded from positive/negative totals but included in overall
  balance; transactions without categories bucket to "no category".
- **Volatile-category flag:** `|net| > 0` AND throughput > 5000 AND
  `throughput / |net| > 3` (e.g. a salary account parked in a category).
- **Per-bank breakdown:** totals and counts per bank for the selected month,
  sorted by absolute total.
- **History heatmap:** per-day totals/counts; color intensity scaled against
  the month's total.
- **Trends:** month-over-month % change of `overall_user_balance`
  (`(current − previous) / previous`); when no previous month exists, falls back
  to `monthly_total / overall_user_balance`. Monthly rows are labeled net
  income/expense by the sign of `monthly_total`. Averages across months are
  reported as "avg income" and "avg change".

### 3.10 Onboarding

New users walk a 4-step wizard, strictly ordered:

1. Confirm currency
2. Create first bank (balance 0)
3. Create first category
4. Create first transaction (link to the transaction dialog)

Steps lock until the prior one is complete; bank/category names are trimmed and
rejected as duplicates (case-insensitive). The wizard disappears once any
transaction exists.

## 4. External integrations

| Integration | Purpose | Contract |
|---|---|---|
| PocketBase | storage/auth/realtime | view collections: `transactions_trends`; relation expansions: bank + categories on transactions |
| Google OAuth2 | primary sign-in; email/password signup also supported | |
| CoinGecko `coins/markets` | live crypto prices, 24h change | quoted in user currency; rate-limit (429) surfaced as an error, not retried |
| Web Push (VAPID) | reminder notifications | public key in app, private key server-side; `web-push`; subscription upsert keyed by (user, endpoint) |
| On-device WebLLM | experimental local chat (test page) | not part of core flows |

## 5. Scheduled jobs

| Job | Auth | Work |
|---|---|---|
| Planned-transaction reminders | `CRON_SECRET` in body | §3.6 reminder rules; sends pushes, stamps `lastNotifiedAt` in one batch |
| Voice-draft cleanup | `CRON_SECRET` in body | deletes `voice_drafts` with `expiresAt ≤ now` |

## 6. Invariants

1. `banks.balance == Σ signed amounts of its transactions` (recoverable by recompute).
2. `expense`/`withdrawal` amounts ≤ 0; `income`/`deposit` amounts ≥ 0.
3. A transfer never targets the same bank on both sides.
4. `tokens.total` and `tokens.costAvg` are exactly what replaying the ledger yields; never edited directly.
5. Deleting a bank or category never orphans transaction references (cascade).
6. Planned transactions never auto-create money movements; a human always confirms the log.
7. Draft tokens and `voiceApiKey` are bearer credentials; the former expire in 5 minutes.
8. Privacy mode is on by default and masks every amount display.
