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

- `＋` — raised circular button, visually dominant, opens Capture Sheet (§4). Long-press opens mini-menu: Expense · Income · Transfer · Trade (jump to sheet with type preselected).
- `Privacy` slot absorbs the current header toggle (thumb-reachable, was top-right).
- Top header slims to: logo (left) · **sync pill** (§6) · avatar→settings/sign-out (right). No actions in header.
- No floating FAB anywhere; the old banks-page FAB dies.

### 3.2 Desktop

Sidebar unchanged structurally (Home/Banks/Crypto/Settings/Sign-out) plus a persistent **Add Transaction** button pinned at sidebar top and global ⌘K (§7). Content area keeps card-on-black layout.

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
- Mobile bar `＋` (shortcuts via long-press)
- Desktop sidebar button, ⌘K "Log transaction", keyboard `n`
- PWA home-screen quick action "Log expense" (Android; §10 iOS gap note)
- Planned-transaction reminder deep link (`?scheduledId=`) — sheet prefilled from schedule
- Voice draft redemption — sheet prefilled from parsed draft
- Share-target (Android): shared text/screenshot → parser prefill
- Inline "Log" buttons on due-today planned cards

### 4.2 Anatomy (top → bottom)

1. **Context strip**: account selector chip (defaults: last-used account; if opened from an account-filtered view, that account) + date toggle `Today · Yesterday · <date>` (default Today).
2. **Amount display**: giant numeric readout (the keypad's mirror), currency symbol of the *account's native asset* (per architecture.md §3.2), sign indicated by Expense/Income state color (red/green).
3. **Suggestions row** (horizontal chips, when available):
   - Due-today planned transactions ("Rent ₱15,000 — Log") — tapping logs immediately with defaults, advances recurrence, haptic + undo toast.
   - Recent repeats: last distinct description+amount+category combos for this account ("Coffee 120 · Food") — tap applies all fields.
4. **Description field**: free text with autocomplete from transaction history (fuzzy); selecting a completion fills category too.
5. **Category chips**: horizontally scrollable favorites/recents first, then full set via picker; optional (skip-friendly).
6. **Type toggle**: Expense | Income (segmented, red/green states; Transfer/Trade accessible via long-press menu or overflow, not primary tabs).
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
- Launch-offline path verified: precached shell + local SQLite → full function including capture.

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
4. Budget pulse (only budgeted categories, thin bars, warn colors)
5. Collapsed summaries: monthly trend chart, volatile notes — below fold
Old AssetSummary tab system dissolves into hero + Crypto page link.

### 8.2 Banks
Header (account switcher pills incl. All), balance line, stat strip (income/expense/net for month), filter row (search/category/month/view), transaction list grouped by day with sticky day headers. Desktop adds charts sections as today.

### 8.3 Crypto
Holdings list (qty, avg cost, price, value, 24h Δ, realized/unrealized P/L), trade button per holding, portfolio allocation bar. Reuses capture-sheet Trade variant for entry.

### 8.4 Settings / Onboarding
Checklist flow preserved (logic.md §14); add sync-status row + push-permission prompt contextual to enabling reminders (not on first launch).

---

## 9. Visual Language (decided U3 refine / U4 dark-only tokens)

Tokens (CSS variables, dark values only in v1):
- Surfaces: `bg` #020617 (slate-950 base) → `surface-1` slate-900 → `surface-2` slate-800 → `surface-3` slate-700; borders `slate-700/50`.
- Accent: emerald-500 family — reserved for primary action, positive delta, sync-ok. Never decorative.
- Semantic: red-500 negative/danger · amber-400 warning/pending · sky/blue informational.
- Type scale: 12/13/15/18/24/36; numerics tabular-nums everywhere; money uses mono-feel weight emphasis not font swap.
- Radii: sm 6 / md 10 / lg 16 / sheet 20(top). Elevation: shadow scale xs–xl mapped to surfaces, not bespoke per card.
- **Gradient purge**: existing per-card gradient stacks (BudgetsSummary, AssetSummary, stats) replaced by flat surface-1 + border + optional 1 accent hairline. Charts keep centralized apexcharts theme (carried from chartOptions.ts approach).
- Motion: 150ms ease-out standard, 250ms sheet spring, nothing longer except celebration micro-animation on save (~400ms, skippable).

Component mapping: shadcn primitives (Dialog→Sheet on mobile, Popover, Command, Toast extended with undo action slot, SegmentedControl for type toggles).

---

## 10. Accessibility & Platform Constraints

- Touch targets ≥44px; keypad keys ≥48px; inputs render ≥16px (iOS zoom prevention — replaces old zoom-hack commit properly).
- Contrast floors: text ≥4.5:1, large text/icons ≥3:1 (slate-500-on-900 pair flagged borderline — bump usage to slate-400 minimum for body).
- Focus-visible rings on all interactive elements; sheet focus trap + return.
- Screen-reader: capture sheet announces amount readout changes; suggestions row labeled list; sync pill aria-live polite.
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
