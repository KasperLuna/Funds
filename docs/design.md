# Funds — Design Specification (UX/UI)

Companion to `logic.md` (domain) and `architecture.md` (stack). Defines the product experience for the rewrite. All decisions here are final unless marked OPEN.

---

## 1. Design Principles

1. **Capture is the product.** Everything else is reporting. Any screen must be ≤1 interaction away from logging a transaction.
2. **Thumb-first on mobile.** Primary actions live in the bottom bar / bottom sheets; top-of-screen is status only.
3. **Local truth, visible sync.** The app always works; sync state is shown honestly but never blocks input.
4. **Calm numbers.** Money data is dense by nature — one accent color, restrained motion, no decorative gradients.
5. **Undo over confirm.** Destructive/risky actions prefer undo affordances over interrupting dialogs (except irreversible account deletion).

## 2. North-Star Metric

**Cold open → transaction logged: ≤5 seconds, ≤3 interactions** (open → tap Add → type amount → Save = 2 interactions + typing).

---

## 3. Information Architecture & Navigation

### 3.1 Mobile (decided U2: bottom-integrated center Add)

Bottom bar, 5 slots, raised center action:

```
[ Home ]  [ Banks ]  ( ＋ )  [ Crypto ]  [ Privacy ]
```

- `＋` — raised circular button, visually dominant, opens Capture Sheet (§4). A small caret cap seated on top opens the mini-menu: Expense · Income · Transfer · Trade (jump to sheet with type preselected). No long-press anywhere — both the capture fast-path and the menu are explicit, discoverable taps.
- `Privacy` slot absorbs the current header toggle (thumb-reachable, was top-right). On mobile the toggle is icon-only in the top header.
- Top header slims to: logo (left) · **sync pill** (§6) · avatar→settings/sign-out (right). No actions in header.
- No floating FAB anywhere; the old banks-page FAB dies.

### 3.2 Desktop

Sidebar, top → bottom:
1. **Account** (name + email)
2. **Visibility** (privacy toggle)
3. **Add group** (split button: main Add → capture, attached caret → Expense · Income · Transfer · Trade)
4. **Navigation** (Home/Banks/Categories/Crypto)

*(bottom-anchored)*

5. **Funds logo** (small, `mx-auto`, links to base route `/`)
6. **Settings**
7. **Sign out**

Global ⌘K (§7) still planned. Content area keeps card-on-black layout.

### 3.3 Route map (unchanged URLs preserved where possible)

| Route | Purpose |
|---|---|
| `/dashboard` | Home hub (capture-first, §8.1) |
| `/dashboard/banks` | Transactions list + stats |
| `/dashboard/banks?bank=X` | Filtered account view |
| `/dashboard/crypto` | Portfolio detail |
| capture sheet | overlay, not a route |

---

## 4. Capture Sheet — Full Spec (decided U1: custom keypad)

The single most important surface. Bottom sheet on mobile, centered dialog on desktop.

### 4.1 Entry points
- Mobile bar `＋` (mini-menu via the caret cap), desktop sidebar split-Add caret
- ⌘K "Log transaction", keyboard `n`
- PWA home-screen quick action "Log expense" (Android; §10 iOS gap note)
- Planned-transaction reminder deep link (`?scheduledId=`) — sheet prefilled from schedule
- Voice draft redemption — sheet prefilled from parsed draft
- Share-target (Android): shared text/screenshot → parser prefill
- Inline "Log" buttons on due-today planned cards

### 4.2 Anatomy (top → bottom)

1. **Context strip** — quiet hairline chips: `[Account ▾]` (opens a popover list with a check on the active account) and `[Date ▾]` (Today · Yesterday presets plus a full calendar for custom dates, default Today). Templates are nested behind a third `[Templates ▾]` chip — 2 taps to apply (open picker → tap template); the active template shows a check.
2. **Amount display**: giant numeric readout (the keypad's mirror), currency symbol of the *account's native asset* (per architecture.md §3.2), sign indicated by Expense/Income state color (red/green).
3. **Suggestions row** (horizontal chips, below the hero, when available):
   - Recent repeats: last distinct description+amount+category combos for this account ("Coffee 120 · Food") — tap applies all fields; the sign sets the type (negative → expense, positive → income).
4. **Description field**: free text with autocomplete from transaction history (fuzzy); selecting a completion fills category too.
5. **Category chips**: horizontally scrollable favorites/recents first, then full set via picker; optional (skip-friendly).
6. **Type toggle**: Expense | Income (segmented, red/green states; Transfer/Trade accessible via the Add caret menu, not primary tabs).
7. **Custom keypad** (replaces OS keyboard):

```
[ 1 ][ 2 ][ 3 ][ ⌫ ]
[ 4 ][ 5 ][ 6 ][ . ]
[ 7 ][ 8 ][ 9 ][ 00 ]
[ C ][ 0 ][ Save(✓) ]
```

- Keys ≥48px tall, haptic tick on press (respect reduced-motion/haptics settings).
- `00` shortcut for whole amounts; `.` respects asset `decimals` (max digits enforced per asset).
- **Save key doubles as the only submit** — always enabled when amount > 0; disabled state explains why inline ("Enter amount").
- Keypad hidden on desktop dialog (physical keyboard, amount input focused).

### 4.3 Speed rules
- Sheet opens with zero network dependency (local DB), no skeleton delay ever.
- Save = single local write → instant dismiss + success haptic + undo toast (5s window). Sync happens silently after.
- Repeat-purchase benchmark: open → suggestion chip → done = 2 interactions, no typing.
- After save, sheet may reopen instantly via bar `＋` for batch entry sessions.

### 4.4 Variants
- **Transfer**: origin→destination account selectors, one amount, "different amounts" disclosure for fees (logic.md §4.3 semantics).
- **Trade**: sell leg (account+asset+amount) → buy leg (account+asset), auto rate preview from rates table, optional fee leg (architecture.md §3.6).
- Both reuse keypad + context strip; accessed from long-press menu and desktop ⌘K.

---

## 5. Interactions, Gestures, Feedback

| Context | Gesture | Action |
|---|---|---|
| Transaction row | swipe leading (right) | Duplicate (instant + undo toast) |
| Transaction row | swipe trailing (left) | Delete (undo toast, 5s) |
| Transaction row | tap | Edit sheet (same capture sheet, prefilled) |
| List | pull down | Refresh/replay sync |
| Bottom sheet | drag handle down / backdrop tap | Dismiss |
| Amount readout | tap | Clear amount |

Feedback rules:
- Every mutation → immediate optimistic UI + subtle success haptic (mobile) + undo toast. No blocking spinners on user actions; skeletons only for genuinely async loads (charts, remote-only data).
- Undo implementation rides the local-first stack: revert = compensating local mutation before sync.
- Reduced-motion honored globally (`prefers-reduced-motion`: no shimmer/scale/parallax).

---

## 6. Sync & Offline UX (new surfaces)

- **Sync pill** (mobile header, desktop sidebar footer): states
  - `✓ Synced` (muted, fades after 2s of stability)
  - `↑ N pending` (accent, tappable → queue detail sheet: list of unsynced mutations w/ timestamps)
  - `⚠ Offline` (amber; app fully usable, pill persists)
  - `⚠ Conflict` (red; tap resolves — see below)
- Conflicts resolve server-authoritative silently (architecture.md §1); pill escalates to red only when a user-visible value changed against their intent; resolution UI = side-by-side "Yours / Now on server" pick.
- Freshness stamp under net-worth hero when stale: "updated 2h ago".
- Launch-offline path verified: precached shell + local Dexie store → full function including capture.

### Sync architecture (verified end-to-end 2026-08-23)

Local writes land in the Dexie (IndexedDB) store via `store.ts`; money is stored as strings and materialized as BigInt at the read boundary. The engine (`engine.ts`) pushes the outbox through the auth-gated tRPC `applyMutations` endpoint, which stamps `user_id` from the session, resolves idempotently (updated_at LWW), and upserts Postgres. Deltas pull back via `GET /api/sync/data?since=<ms>` and advance a server-echoed watermark; soft-deletes propagate on the monotonic watermark. Sync runs every 30s on a visible tab plus on `online`/`pageshow`/`visibility`. A confirmed sign-out (401) or an account switch wipes the Dexie store.

Contract invariants that must hold or sync silently breaks:
- Row mappers use snake_case keys (`asset_id`, `amount_minor`, …) matching the server columns; jsonb columns are JSON strings on the wire and normalized to arrays/objects in `normalize.ts`.
- Assets are global (not per-user) and served via tRPC `assets.list`; accounts reference real asset ULIDs, never synthetic `ast-*` ids.

---

## 7. Desktop Experience (decided U6a)

- **⌘K palette** (cmdk): commands — navigate (Home/Banks/Crypto/accounts), Log transaction / transfer / trade, Log scheduled…, Toggle privacy, Sign out, Sync now.
- Shortcuts: `n` new txn · `/` focus search · `g h/b/c` go tabs · `Esc` close layers.
- Table view stays default-dense on ≥lg; add inline MoM delta column (▲▼ %) and per-account sparkline in Banks header.
- Bulk operations deferred (documented non-goal for v1).

---

## 8. Screen Inventory

### 8.1 Home hub (decided U5: capture-first)
Order:
1. Net worth hero (compact; total + Banks/Crypto split bars; privacy-maskable; freshness stamp)
2. **Due today / overdue planned transactions** as one-tap Log cards (empty → hidden)
3. **Recent activity** (last ~10 txns, swipeable like Banks rows)
4. Budget pulse (only budgeted categories, thin bars, warn colors, per-category usage %) — amounts privacy-maskable, percentages always visible
5. Collapsed summaries: monthly trend chart, volatile notes — below fold
Old AssetSummary tab system dissolves into hero + Crypto page link.

### 8.2 Banks
Header (account switcher pills incl. All) + Total (privacy-maskable). When an account is selected, a **"This month" stat strip** (Income/Expense/Net, labeled with the current month, privacy-maskable). A **sticky filter bar** (full-text search across description/category/account name · category multi-select popover · date-range popover with a calendar) sits above the transaction list. Transaction list grouped by day with sticky day headers; on mobile the redundant Add-transaction button is hidden (the footer `＋` covers it). Desktop adds charts sections as today.

### 8.5 Landing page (base route `/`)
Centered pitch (logo · one-line description · highlight chips · Open app CTA) over the guilloche field, with a bottom-anchored **"by KasperLuna"** link (wordmark SVG → kasperluna.com) mirroring the bridge-reborn footer.

### 8.3 Crypto
Holdings list (qty, avg cost, price, value, 24h Δ, realized/unrealized P/L), trade button per holding, portfolio allocation bar. Reuses capture-sheet Trade variant for entry.

### 8.4 Settings / Onboarding
Checklist flow preserved (logic.md §14); add sync-status row + push-permission prompt contextual to enabling reminders (not on first launch).

---

## 9. Visual Language (Intaglio Plate — replacement world, built & approved 2026-08-23)

Tokens (CSS variables, dark-only; OLED-optimized):
- Surfaces: `bg` #000000 (true black — OLED pixels off) → `surface-1` #000000 → `surface-2` #050505 → `surface-3` #0d0d0d; separation via 1px engraved hairlines (`--border: rgba(255,255,255,0.13)`), never elevation.
- Accent: emerald-500 family — reserved for capture, sync-ok, positive delta. Never decorative.
- Semantic: red-500 negative/danger · amber-400 warning/pending · sky/blue informational.
- Type scale: 12/13/15/18/24/36; numerics tabular-nums everywhere.
  - **Display tier (the two hierarchy peaks):** net-worth hero and capture amount readout — Space Grotesk 700, tracking −0.03em. Hero clamp(2.75rem, 6vw, 4rem); readout clamp(2.25rem, 4vw, 3rem). Body/UI on Inter (self-hosted via next/font). Money renders in the UI sans with tabular-nums — no mono swap.
- Materials: black plates with engraved hairline borders; faint guilloche crosshatch lattice (repeating 45° 1px lines at ~4.5% white) behind the net-worth hero and capture readout; latent-image microtext labels (`.label-micro`: 10px, weight 600, tracking 0.16em, uppercase, zinc-400) for stat labels, day headers, section eyebrows; the emerald thread is the only saturated accent.
- Radii: sm 3 / md 5 / lg 8 / sheet 10 — sharp, plate-cut. Elevation: none by elevation; depth reads through hairlines and true-black contrast.
- No gradients, no glow, no soft shadows on plates. Motion: 150ms ease-out standard, 250ms sheet arrival, nothing longer except the save micro-moment.

Component mapping: shadcn primitives (Dialog→Sheet on mobile, Popover, Command, Toast extended with undo action slot, SegmentedControl for type toggles), all rebuilt as plates: hairline-bordered keys/inputs, emerald save key, engraved numerals.

---

## 10. Accessibility & Platform Constraints

- Touch targets ≥44px; keypad keys ≥48px; inputs render ≥16px (iOS zoom prevention — replaces old zoom-hack commit properly).
- Contrast floors: text ≥4.5:1, large text/icons ≥3:1 (slate-500-on-900 pair flagged borderline — bump usage to slate-400 minimum for body).
- Focus-visible rings on all interactive elements; sheet focus trap + return.
- Screen-reader: capture sheet announces amount readout changes; suggestions row labeled list; sync pill aria-live polite.
- **Privacy masking** (default-on, session-scoped): masks all money figures — net-worth hero, Banks total + "This month" strip, budget-pulse spent/budget amounts, categories spent/budget and `/mo` lines, and crypto total/P-L/avg-cost. Percentages (budget usage, P/L %, allocation) always stay visible. Masked values carry `aria-label` so screen readers announce the hidden state rather than bullets.
- Haptics gated by `prefers-reduced-motion` equivalent + device setting.
- PWA platform realities (documented, designed around):
  - iOS: no share-target, limited/no home-screen shortcuts manifest support → voice webhook remains the iOS fast-path; Android gets share-target + shortcuts.
  - Offline launch requires installed-to-home-screen (iOS ITP storage policy) — onboarding nudges install with benefit framing.
  - `navigator.storage.persist()` requested post-first-capture; low-storage warning surfaced in sync pill tooltip.

---

## 11. Performance Budgets (UX-facing)

- Cold launch (installed, offline): interactive ≤2s mid-tier Android.
- Capture sheet open: ≤100ms (premounted/kept-warm).
- Keypad keypress → readout: ≤16ms frame budget.
- Local mutation → UI reflect: same frame (optimistic).
- List scroll: 60fps at 10k txns (virtualized beyond 200 rendered).

---

## 12. OPEN Items (none blocking build start)

- Light theme (deferred indefinitely, tokens keep door open).
- Widgets / OS-level quick tiles (post-v1).
- Bulk edit desktop (post-v1).
