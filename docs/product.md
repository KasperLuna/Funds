# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Existing monorepo (pnpm workspaces): Next.js App Router + shadcn/ui in `apps/web`; shared `packages/core` (pure logic) and `packages/db` (Drizzle schema). Tailwind v4, tRPC, PowerSync local-first sync (SQLite WASM over OPFS), Better Auth, Serwist PWA. User-answered during interview: not part of this redesign.

## Users

A single privacy-conscious individual tracking their own money across multiple accounts and currencies. They use the app on their phone throughout the day and on desktop for review. Their core job is logging transactions fast — often in a hurry, often offline, sometimes hands-free (voice shortcut).

## Product Purpose

Funds is a multi-currency personal finance tracker, delivered as an installable PWA. It captures every transaction fast, works fully offline, syncs in the background, and keeps money data private by design. Success = logging a transaction in under 5 seconds from a cold open.

## Positioning

Local-first and private-first finance tracking where capture is the product: every screen stays ≤1 interaction from logging a transaction, all data is owned per-user, the app is fully functional offline, and privacy masking is default-on. No other screen dominates; reporting serves the capture habit.

## Operating Context

- Mobile is the primary capture surface: bottom-bar navigation, thumb-reachable primary actions, bottom-sheet capture with a custom keypad.
- Desktop is the review surface: sidebar navigation, ⌘K command palette, keyboard-first.
- The app must work on low-mid-tier Android OLED phones (the performance budget is written for them) and on desktop.
- Background sync (PowerSync) keeps the local SQLite store in sync; sync state is surfaced honestly but never blocks input.
- Voice/webhook capture pipeline (phone shortcut posts text, parsed draft prefills the capture sheet).
- Deep links: `?capture=1` opens the sheet, `?scheduledId=` prefills from a reminder, `?draftToken=` redeems a voice draft.
- Privacy toggle (session-scoped, defaults on) masks all money values.

## Capabilities and Constraints

Confirmed capabilities (from `logic.md` / `architecture.md`, preserved under redesign):
- Accounts (bank/cash/wallet/exchange), signed transactions, categories with optional monthly budgets, transfers as linked legs, trades with average-cost basis and realized/unrealized P/L, scheduled transactions with recurrence + push reminders, voice capture, per-month trends/analytics, privacy mode, demo guest account.
- Money is bigint minor units — never floats. Assets carry a `decimals` exponent; the capture keypad enforces it.
- Dark-only UI in v1. Light theme deferred indefinitely; tokens keep the door open.
- PWA constraints: iOS lacks share-target/home-screen shortcuts (voice webhook is the iOS fast-path); offline launch requires install-to-home-screen on iOS; `navigator.storage.persist()` requested after first capture.
- Performance budgets: cold launch interactive ≤2s; capture sheet open ≤100ms; keypad→readout ≤16ms frame; 60fps list scroll at 10k txns.

## Brand Commitments

- Product name **Funds** (logo mark: "F" in a rounded square).
- Capture-first: any screen ≤1 interaction from logging a transaction.
- Privacy is a product feature: masking default-on, per-session.
- Dark-only v1; OLED-optimized (pure-black base so pixels truly turn off), sharp high-contrast presentation is the stated redesign direction. One accent color, restrained motion, no decorative gradients.

## Evidence on Hand

- `docs/logic.md` — full domain spec (entities, invariants, calculations, workflows).
- `docs/architecture.md` — decided stack, data model, sync design, migration notes.
- `docs/design.md` — incumbent UX/UI spec and visual language (Intaglio Plate world, built & approved 2026-08-23).
- `docs/implementation.md` — implementation plan + live deploy notes.
- Working incumbent implementation in `apps/web` (components, tokens, routes) — used as anti-reference for the redesign.
- No marketing claims, testimonials, pricing, or imagery exist; none should be fabricated.

## Product Principles

1. **Capture is the product.** Speed to a logged transaction outranks every other surface consideration; nothing may add friction between intent and save.
2. **Local truth, visible sync.** The app always works offline; sync state is shown honestly but never blocks input.
3. **Calm, legible numbers.** Money is dense and high-stakes: one accent color, restrained motion, tabular numerals everywhere, no decorative gradients.
4. **Undo over confirm.** Risky actions prefer undo affordances over interrupting dialogs.
5. **Privacy by default.** Masking is on until the user chooses otherwise; the design should make the masked state feel like the default posture.

## Accessibility & Inclusion

- Touch targets ≥44px; keypad keys ≥48px; inputs render ≥16px (iOS zoom prevention).
- Contrast floors: text ≥4.5:1, large text/icons ≥3:1. Body text must never drop below slate-400-equivalent luminance on dark surfaces.
- Focus-visible rings on all interactive elements; capture sheet focus trap + return.
- Screen-reader announcements for amount readout changes, suggestions list, and sync pill (aria-live).
- Haptics gated by `prefers-reduced-motion` + device setting; reduced-motion honored globally.
