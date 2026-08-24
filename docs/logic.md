# Funds — Business Logic Specification

Domain extraction of the Funds personal-finance tracker. Describes **what** the system does: entities, invariants, calculations, workflows, and integrations. Deliberately excludes implementation choices (framework, database, UI libraries) so it can be re-implemented on any stack.

---

## 1. Product Summary

A multi-currency personal finance tracker delivered as an installable PWA. A single user tracks money across named accounts ("banks"), categorizes income/expense transactions, sets monthly budgets, schedules recurring (planned) transactions with reminders, maintains a manual crypto portfolio valued against live market prices, reviews monthly/trend analytics, and captures transactions hands-free through a voice/webhook pipeline. All data is private per-user; there are no shared or multi-tenant workspaces.

---

## 2. Core Concepts (Glossary)

| Concept | Meaning |
|---|---|
| **Bank** | A user-named real-world account (checking, savings, cash wallet, credit card). Holds a running `balance`. |
| **Transaction** | A signed money movement on one bank at one point in time, tagged with 0..n categories. |
| **Category** | Spending tag. Optionally carries a monthly budget and analytics flags. |
| **Planned Transaction** | A scheduled future occurrence with recurrence. |
| **Template** | A reusable prefill for quick entry. Stored in the same entity as planned transactions, distinguished by a flag. |
| **Token** | A manually-tracked cryptocurrency holding (identified by its CoinGecko ID). |
| **Token Transaction** | A buy or sell lot for a token; source of truth for holdings math. |
| **Trend** | Derived per-month aggregate: net flow and total balance snapshot. |
| **Voice Draft** | Ephemeral parsed transaction proposal, redeemed once within a short TTL. |

---

## 3. Entities & Data Structures

### 3.1 User
```
id
email                      (unique credential)
username                   (display name)
currency                   nullable object { code, name, symbol } — user's single base currency
voiceApiKey                optional secret; authenticates external voice/webhook clients
verified                   bool
created / updated          timestamps
```
Rules:
- One base currency per user; all monetary display uses it.
- `voiceApiKey` grants programmatic access scoped to this user only.

### 3.2 Bank
```
id
user                       owner
name                       string; unique per user (case-insensitive check enforced at creation UX level)
balance                    number, any sign
primaryColor, secondaryColor   optional cosmetic colors
created / updated
```

### 3.3 Category
```
id
user
name             unique per user (exact match check at creation)
hideable         bool     — user may exclude it from pickers/lists
total_exempt     bool     — excluded from monthly positive/negative aggregate totals (analytics exemption, e.g. transfers-between-own-accounts noise)
monthly_budget   number | null — monthly spending limit for this category
created / updated
```

### 3.4 Transaction
```
id
user
description    free text, may be empty
type           enum: income | expense | deposit | withdrawal
amount         SIGNED number. expense/withdrawal stored negative; income/deposit positive.
bank           reference -> Bank
categories     array of references -> Category (0..n)
date           timestamp; stored in UTC
created / updated
```
Sign conventions (critical invariant):
- `expense` ≡ `withdrawal` semantically (both negative); `income` ≡ `deposit` (both positive). Editing a transaction collapses withdrawal→expense and deposit→income in the form.
- Form inputs capture magnitudes; the system negates them for expense-type entries before storage. All stored amounts are signed.

### 3.5 PlannedTransaction (planned occurrences AND templates share this entity)
```
id
user
name            display name (used by templates)
description
type            same enum as Transaction
amount          SIGNED number (same convention as Transaction)
bank            reference -> Bank
categories      array of refs
recurrence      null for templates; else { frequency: daily|weekly|monthly|yearly, interval?: number (default 1) }
timezone        integer | null — user's UTC offset in HOURS (not minutes); null for templates
previousDate    timestamp | null — when this was last invoked/logged
invokeDate      timestamp | null — next scheduled occurrence; null for templates
lastNotifiedAt  timestamp | null — last reminder sent
active          bool, default true (planned only)
isTemplate      bool — true ⇒ template record; false/absent ⇒ scheduled planned transaction
created / updated
```

### 3.6 Token (crypto holding)
```
id
user
name, symbol        display metadata
coingecko_id        external market identifier (dedup key per user)
total               derived quantity held
costAvg             derived average cost per unit
created / updated
```
`total` and `costAvg` are always recomputed from token transaction history — they are projections, never independently authoritative.

### 3.7 TokenTransaction
```
id
user
token         reference -> Token
type          buy | sell
amount        quantity of units (> 0)
price         unit price at transaction time (>= 0)
total_cost    amount × price (stored denormalized)
date          timestamp
note          optional text
```

### 3.8 Trend (derived, one row per month)
```
year                 number
month                month name/string
monthly_total        net money movement for that month
overall_user_balance total balance across all banks at that month
```
Read-only from the client's perspective; produced by aggregation.

### 3.9 PushSubscription
```
id
user
endpoint    push service URL (uniquely identifies a device/browser)
keys        { p256dh, auth } encryption keys
```
One user may hold many subscriptions (one per device).

### 3.10 VoiceDraft (ephemeral)
```
token       random UUID — redemption key
preview     JSON payload: parsed transaction proposal
source      e.g. "shortcut"
user        owner
createdAt
expiresAt   createdAt + 300 seconds (5 min TTL)
```

---

## 4. Money Movement Rules

### 4.1 Balance lifecycle (invariant: bank.balance reflects all posted transactions)

| Event | Balance effect |
|---|---|
| Create transaction | `balance += amount` |
| Delete transaction | `balance -= amount` |
| Duplicate transaction | copy of record created (new id) + `balance += amount` |
| Edit, same bank | `balance = balance − original.amount + new.amount` |
| Edit, moved to another bank | old bank: `balance −= original.amount`; new bank: `balance += new.amount` |

Create/edit/delete of a transaction and its balance adjustment must be applied atomically as one batch.

### 4.2 Full recompute (manual repair path)
Sum every transaction of the bank chronologically. Floating-point guard while accumulating: after each addition, if `|sum mod 1| < 1e-12`, snap with `floor()` to eliminate drift (e.g. 99.99999999 → 99). Result overwrites stored balance.

### 4.3 Transfer
A transfer between two banks is modeled as **two transactions**:
1. expense on origin bank (−originDeduction)
2. income on destination bank (+destinationAddition, or +originDeduction if legs are equal)

Constraints:
- Origin ≠ destination (validated).
- Legs may differ (fee/exchange cases) behind a "transfer different amounts" toggle; otherwise both equal the single entered amount.
- Both legs share description/date/categories.

### 4.4 Difference (balance reconciliation)
User observes their real-world balance and enters `newBalance`.
```
delta = newBalance − currentBankBalance
if delta > 0 → income transaction of delta
if delta < 0 → expense transaction of |delta|
delta == 0 → nothing to post
```
UI shows projected delta live while typing.

---

## 5. Categories & Budgets

### 5.1 Assignment
- Transactions carry 0..n categories.
- For per-category analytics, a transaction's amount is **split proportionally** across its categories: each category receives `amount / count`. Uncategorized amounts aggregate under a synthetic "no category" bucket.

### 5.2 Monthly aggregates
For a selected month:
- `totalPositive` / `totalNegative`: sums of positive/negative amounts among *categorized* transactions, excluding any transaction touching a `total_exempt` category.
- `overallBalance`: sum of ALL categorized transactions (exempt included).
- `uncategorizedTotal`: sum of uncategorized transactions.
- Per-category net total, throughput (sum of |amount|), inflow/outflow split.

### 5.3 Budgets
- `monthly_budget` per category; treated as a magnitude limit.
- Spent = |proportional-split net total| for that category in the month.
- Remaining = budget − spent; negative ⇒ over budget.
- Thresholds drive status: ≥80% of budget = warning; >100% = over-budget alert.
- Global rollup: Σ budgets vs Σ spent across budgeted categories, same thresholds.

### 5.4 Volatile category flagging
A category is flagged volatile when:
```
throughput > 5000  AND  throughput / |net total| > 3
```
(high churn relative to net effect — e.g. money moving in and out). Flag displays inflow/outflow decomposition.

### 5.5 Deletion semantics
Deleting a category must first remove its reference from every transaction containing it, then delete the category (no dangling references).

---

## 6. Banks

- Create: name (trimmed, uniqueness checked case-insensitively against existing), initial balance (onboarding defaults 0).
- Rename in place.
- Delete: **all** child transactions deleted first (with their balances implicitly vanishing with the bank), then the bank.
- Manual "recompute balance" repair action per bank (see 4.2).
- Optional brand colors used cosmetically.

---

## 7. Month Handling

- Analytics operate on a selected month (default: current).
- Range queries pad ±1 day around calendar month bounds because timestamps are stored in UTC; results are then **re-filtered client-side** so only transactions whose local-time month equals the requested month remain.
- This UTC/local mismatch handling is an explicit business rule; a rewrite may solve it differently but must produce correct local-month membership regardless of storage timezone.

---

## 8. Planned Transactions, Templates & Recurrence

### 8.1 Two record kinds, one entity
- **Template**: `isTemplate = true`. No recurrence/invokeDate/timezone. Pure prefill (name, type, amount, description, bank, categories). Selecting a template in the transaction form populates those fields.
- **Planned**: `isTemplate ≠ true`. Has `active`, `recurrence`, `invokeDate`.

Amount signing matches transactions: expense-type planned amounts stored negative.

### 8.2 Upcoming window (default view)
Show active planned transactions where:
```
invokeDate ≤ now + 2 days (end of day)
AND (previousDate == null OR previousDate < now)   // not already logged this cycle
```
Sorted ascending by invokeDate. An expanded view lists all active sorted by invokeDate.

### 8.3 Occurrence lifecycle
When the user logs the planned transaction (prefilled form: id stripped, date defaulted to today):
1. Create the real transaction(s) (full balance rules from §4 apply).
2. Advance schedule:
   ```
   previousDate = old invokeDate
   invokeDate   = old invokeDate + recurrence step
   ```
   Step by frequency: daily → +interval days; weekly → +interval×7 days; monthly → +interval months; yearly → +interval years.

"Waive" skips logging but still advances the schedule identically.

### 8.4 Reminders (scheduled job, runs periodically)
For every active planned transaction with an invokeDate, compute everything in the **user's local time** by applying the stored hour-offset timezone to UTC instants. Notify when ALL hold:
- invokeDate's local date == today's local date;
- current instant ≥ invokeDate instant (due time reached);
- not already notified today, OR last notification older than 3 hours (re-prompt escape hatch).

Delivery:
- Push message to every registered device subscription; title `"Log Now: {description} due today!"`, body directs user to open app.
- Deep link carries the planned-transaction id (`?plannedId={id}`) so opening the app auto-opens the prefilled log dialog.
- `lastNotifiedAt` batch-updated only if at least one delivery succeeded for that reminder.
- Job endpoint guarded by a shared cron secret.

---

## 9. Voice Capture Pipeline

Hands-free entry driven by an external automation (phone shortcut / webhook):

1. Client sends `{ text }` with `Authorization: Bearer {voiceApiKey}`.
2. Server resolves user by exact `voiceApiKey` match; rejects unknown keys (401).
3. Server loads that user's account names + category names and runs the deterministic parser (§9.1) on the raw text.
4. Parsed result stored as a VoiceDraft with a fresh random token, TTL 5 minutes.
5. Response returns `draftToken` + preview immediately.
6. When the app opens (or polls), it redeems the token → draft preview pre-populates the new-transaction form. Missing/expired token → 404.
7. Housekeeping job deletes drafts where `expiresAt ≤ now`.

### 9.1 Parser algorithm (deterministic, offline, no ML)

Input: raw text + candidate lists (account names, category names).

Normalization (shared):
- lowercase; Unicode NFD; strip diacritics; punctuation → space; collapse whitespace.
- Numbers: comma decimals (`12,50`) normalized to dot.
- Candidate CamelCase names split into words before matching.

**Step 1 — Amount:** first numeric token via pattern allowing optional currency marker (`$ € £ USD EUR GBP`). Currency inferred from symbol/code found anywhere in text (default none).

**Step 2 — Account match:** score every candidate against raw text with weighted features:

| Feature | Weight |
|---|---|
| substring containment (either direction, incl. best no-space window) | 0.05 |
| Jaccard token overlap (max of plain vs camel-split variants) | 0.20 |
| best contiguous-window Levenshtein similarity (space-stripped compare) | 0.20 |
| mean per-token Levenshtein similarity, Soundex fallback (phonetic match floors score at 0.7) | 0.20 |
| raw-text coverage: fraction of raw non-numeric tokens "explained" by candidate | 0.30 |
| prefix match on candidate's first token | 0.05 |

Additional rules:
- If the best-window similarity ≥ 0.85, that window's tokens become the canonical match span.
- **Subsumption demotion:** a candidate whose matched window is a strict contiguous sub-window of another candidate's longer window scores 0 (e.g. "Cash" loses to "Gcash Wallet").
- Top candidate accepted iff score ≥ 0.5.

**Step 3 — Category match:** identical scorer. All candidates scoring ≥ 0.4 accepted (multi-match allowed); highest becomes primary.

**Step 4 — Description:** raw text minus amount token, matched account tokens, and all matched category tokens (word-boundary removal; whitespace collapsed). Remainder kept verbatim.

**Step 5 — Confidence:**
```
confidence = 0.5
         + 0.3 (amount found)
         + 0.1 (account matched)
         + 0.1 (category matched), capped at 1.0
```

Output: `{ rawText, amount?, currency?, account?, category?, categories?, description?, candidates, confidence }`.

---

## 10. Crypto Portfolio

- Tokens added by searching the CoinGecko directory; selecting an existing `coingecko_id` navigates to the existing holding instead of duplicating.
- Holdings truth = buy/sell lots. Recompute (after every lot add/delete):
  ```
  iterate lots by date ascending:
    buy:  totalQty += amount; totalCost += amount×price
    sell: costPerUnit = totalCost / totalQty (guard qty>0)
          totalCost -= costPerUnit × soldQty        // average-cost method
          totalQty  -= soldQty
  total  = max(totalQty, 0)
  costAvg= totalQty > 0 ? totalCost / totalQty : 0
  ```
- Validation: quantity > 0, price ≥ 0; `total_cost = amount × price` computed, never typed.
- Market valuation: batch-fetch current prices for all distinct `coingecko_id`s denominated in the user's currency. Value = `total × current_price`. Price data cached long (≈24h stale window); rate-limit responses surface a friendly error and disable retries; requests time out (~20 s).
- Realtime cache maintenance: lot inserts/updates/deletes patch the local list incrementally.

---

## 11. Asset Summary & Analytics

### 11.1 Net worth composition
```
bankTotal   = Σ bank.balance
cryptoTotal = Σ (token.total × market price)
overall     = bankTotal + cryptoTotal (crypto counted only when portfolio value > 0)
```
Three views: Overall (banks + crypto merged, sorted by value desc), Banks only, Crypto only. If no crypto exists, crypto views are unavailable and selection falls back to banks. Each asset row shows value + % of tab total; banks deep-link into filtered transaction views.

### 11.2 Trends
Monthly rows (net monthly flow + cumulative total balance). Between consecutive months:
```
percentChange = (cur.balance − prev.balance) / prev.balance × 100
oldest month  = monthly_total / overall_balance × 100
```
Displays average percent change and average monthly income across all trended months; line chart of monthly totals and balance; swipeable per-month cards.

### 11.3 Monthly breakdown
Tabs: per-category charts (proportional split totals incl. "no category") and per-bank charts (net totals + transaction counts, toggleable), plus history charts. Exemption rules per §5.2 apply.

### 11.4 Transaction browsing
- Infinite-scroll list (page size ~20), newest first.
- Filters: bank, free-text search (matches description OR amount prefix), category multi-select (OR-combined), month.
- Grouped by calendar date; card or table view toggle; live updates arrive via realtime channel with bounded reconnect retries (graceful degradation notice on failure).

---

## 12. Notifications Infrastructure

- Web Push with VAPID keys; service worker handles display.
- Subscribe flow: request permission → register worker → browser push subscription → **upsert** by endpoint (update keys if endpoint exists, else create).
- Unsubscribe: remove backend records for that endpoint, then browser unsubscribe.
- Users may send themselves a test push.
- Multiple devices supported simultaneously.

---

## 13. Privacy Mode

- Session-scoped boolean, **defaults to true** every session.
- When on, all monetary values render masked (`symbol + ••••`) until revealed; explicit global toggle reveals values.
- Applies consistently across dashboards, summaries, charts, and cards.

---

## 14. Onboarding

Sequential checklist shown until complete; steps unlock progressively (first incomplete step highlighted):
1. Confirm/set base currency.
2. Create ≥1 bank (name trimmed; duplicate rejected case-insensitively).
3. Create ≥1 category (exact-name duplicate rejected).
4. Create ≥1 transaction.

Currency choice persisted on the user record; completion state for currency also remembered locally.

---

## 15. Auth & Session

- Signup/sign-in via email+password; Google OAuth supported.
- Session persisted client-side with ~720-hour (30-day) expiry wrapper.
- Sign-out terminates realtime channels, clears credentials, removes persisted cookie remnants.
- Server-side operations (crons, webhook endpoints) authenticate either with admin-level credentials or dedicated secrets — never with end-user sessions.

---

## 16. Formatting & Localization Utilities (business-relevant behavior)

- Money rendering: locale-aware currency format using user's currency; 0–2 fraction digits.
- Numeric display helper truncates (not rounds) to 2 decimals.
- Signed-amount presentation: negatives red, positives green throughout analytics.
- Date helpers convert stored UTC instants to user-local by adding stored hour offsets.

---

## 17. External Integrations Surface

| Integration | Purpose | Notes |
|---|---|---|
| CoinGecko public API v3 | coin search + market prices | rate-limited; graceful 429 handling |
| Web Push (VAPID) | reminders/test pushes | keys + subject configured server-side |
| Google OAuth | social login | |

Environment surface (names only): backend base URL, backend admin credentials (server-only), VAPID public/private keys + subject, cron shared secret, public app config.

---

## 18. Invariants Checklist (must survive rewrite)

1. Stored transaction/planned amounts are **signed**; expense-family types negative.
2. Every transaction mutation adjusts exactly the affected bank balances atomically.
3. Balances are derivable: `Σ transactions per bank == bank.balance` (mod float-snap rule).
4. Transfers always decompose into two opposite transactions.
5. Category deletion never leaves orphaned references; bank deletion cascades to transactions.
6. Token `total`/`costAvg` are pure functions of lot history (average-cost method, floored at zero).
7. Planned-transaction advancement is identical whether logged or waived.
8. Reminder dedupe: max one notification per planned item per ~3h, once daily under normal cadence.
9. Voice drafts expire in 5 minutes, single-use intent, garbage-collected.
10. Parser is fully deterministic/offline; confidence formula fixed as §9.1.
11. `total_exempt` categories drop out of positive/negative monthly totals but stay inside overall categorized balance.
12. Proportional category splitting governs ALL per-category aggregations.
13. Local-month correctness despite UTC storage.
14. Privacy masking is default-on per session.
15. Per-user data isolation everywhere; no cross-user reads.
16. Push subscriptions upsert keyed by endpoint; one user ⇒ many devices.

---

## 19. Explicit Non-Goals / Legacy Notes

- `deposit`/`withdrawal` types exist in the schema for compatibility but behave identically to `income`/`expense`; a rewrite may collapse them.
- A legacy Firebase config block exists in environment but is unused by current logic (web-push replaced FCM).
- Timezones stored as whole-hour offsets (not minute-precision zones) — acceptable simplification carried from original design.
