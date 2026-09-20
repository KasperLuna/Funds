# Multi-asset transfers — accepted implementation plan

Status: Accepted plan. Not implemented.

Date: 2026-09-20

## Settled decisions

- Cross-asset movement stays in Transfer UI as a `transfers` row; Trade remains untouched.
- The transfer dialog becomes reactive on asset mismatch: `fromAssetId !== toAssetId`.
- Both source and destination amounts are user-entered/confirmed; the rate is derived and frozen.
- Manual destination amount is mandatory; `rates` is optional assist/prefill only and never overwrites user input.
- Add nullable `transfers.rate_text`; surface the frozen rate in the UI.
- Net worth converts the aggregate to `users.base_asset_id`; per-account balances remain native.
- From/to legs are always stats-exempt; fee legs count when tagged non-exempt.
- Amounts and rates are immutable after save; edit description/date/categories only.

## Verified facts

- Production has 11 transfers and 0 cross-asset transfers; no historical transfer repair is required.
- Production `rates` is empty; there is currently no fiat FX provider.
- `users.base_asset_id` exists but has no writer UI; assume null until the Settings selector is added.
- JPY uses 0 decimals; destination inputs must use destination decimals.
- Transfer legs already carry per-leg `asset_id`.
- `value_base_minor` and `trade_id` are trade-only and out of scope.

## 1. Reactive cross-asset capture

Files:

- `apps/web/src/components/capture/transfer-form.tsx`
- `apps/web/src/lib/capture/transfer-payload.ts`
- `apps/web/src/lib/capture/transfer-payload.test.ts`
- `apps/web/src/lib/transfers/transfer-store.ts`

Approach:

- Compute `crossAsset = from?.assetId !== to?.assetId`.
- Keep the existing same-asset flow unchanged.
- In cross-asset mode, show destination amount using destination decimals.
- Add optional destination prefill from `rates` using `convert()` from `@funds/core/money`.
- Detach rate assist permanently after the user edits destination.
- Add optional `toAmountMinor` to `TransferForm`; use it for the destination leg.
- Extend validation for cross-asset transfers: both legs greater than zero.
- Default categories to exempt Transfer; preserve user-added tags without changing leg exemption.
- Keep fee behavior unchanged: origin-side expense linked by `transfers.fee_transaction_id`.

## 2. Frozen rate model

- Rate means destination-major per one source-major unit.
- Normalize by stripping trailing zeros.
- Cap at 12 significant digits.
- Require finite and greater than zero.
- Store the normalized decimal string in `transfers.rate_text`.
- Display source-to-destination rate plus computed inverse.
- Store only the canonical direction; never store the inverse.

Example:

- `₱1 = $0.01704`
- Display-only inverse: `$1 = ₱58.68`

## 3. Schema and sync

Files:

- `packages/db/src/schema.ts`
- `packages/db/drizzle/000X_*.sql`
- `apps/web/src/server/table-registry.ts`

Approach:

- Add nullable `rate_text` to `transfers`.
- Add `rate_text: "rateText"` to `transfersSnakeToCamel`; inverse mapping derives automatically.
- No `normalize.ts` change is needed for a text column.
- Generate migration with drizzle-kit.
- Run `pnpm run db:migrate`.
- Verify with `pnpm run db:check`.
- Existing transfers read `rate_text` as null and display no rate.
- No data backfill is required.

## 4. Base-currency net worth

Files:

- `apps/web/src/components/home/dashboard-screen.tsx`
- `apps/web/src/components/home/net-worth-hero.tsx`
- Settings base-currency UI
- Fiat/base conversion helper near `apps/web/src/lib/crypto/valuation.ts`

Approach:

- Leave `computeBalance` unchanged.
- Convert only the net-worth aggregate to the resolved base asset.
- Resolve base asset as `users.base_asset_id`, falling back to first non-archived account asset.
- Show a Settings banner until an explicit base currency is selected.
- Add a Settings base-currency selector writing `users.base_asset_id`.
- Include the full flow requested for Q9: selection, fallback, aggregate conversion, and missing-rate display.
- Exclude accounts without a convertible pair from the total.
- List excluded accounts separately using native amounts and a badge.
- Never raw-sum mixed-currency minors.
- Never block rendering or saving because rates are missing.
- Do not write user-negotiated transfer rates into market `rates`.

## 5. Budgets and insights

Universal rule:

> Skip a transaction leg with `transferId`, unless its ID equals its transfer's `fee_transaction_id`.

Apply in:

- `apps/web/src/lib/categories/categories-store.ts`
- `apps/web/src/lib/analytics/compute.ts`
- `apps/web/src/components/home/non-budgeted-flow.tsx`
- `apps/web/src/lib/assistant/queries.ts`
  - `categorySlicesForRange`
  - `incomeExpense`
  - merchants loop
  - search loop
- Budget assistant path inherits the `computeBudgetUsage` fix.

Implementation notes:

- `computeBudgetUsage` needs a fee-leg ID set because budget rows do not carry the parent transfer reference.
- Ensure assistant `QueryCtx` carries `transferId` from the existing `use-chat.tsx` mapping.
- Leave `monthStats` unchanged; per-account flows correctly include transfer legs.
- Leave mixed-minor multi-currency summation outside transfers unchanged.

Result:

- Transfer movement never counts as spending or budget usage.
- A transfer tagged with a budgeted category does not distort that budget.
- A fee counts only when tagged non-exempt.

## 6. Display, edit, and delete

Files:

- `apps/web/src/components/banks/transaction-row.tsx`
- Transfer-leg edit path
- Transfer delete path

Approach:

- Retain transfer badges.
- Show both native leg amounts for cross-asset transfers.
- Show the frozen rate for cross-asset transfers.
- Route transfer-leg edits to transfer-aware editing.
- Permit editing description, date, and categories across all non-deleted legs.
- Render amounts and rate read-only after save.
- Require delete plus recreate for amount changes.
- Route transfer-leg deletion through whole-transfer tombstoning via `undoTransfer`.
- Close the existing single-leg orphan behavior for transfers.

## 7. Tests

Update or add coverage for:

- Unequal cross-asset legs.
- Destination decimals, including JPY 0 decimals.
- Rate normalization and validation.
- Missing-rate manual entry.
- Dexie, outbox, `applyMutations`, pull, and registry round-trip for `rate_text`.
- Budget exclusion for transfer legs.
- Fee inclusion only when non-exempt.
- Assistant spending, budget, income/expense, merchants, and search behavior.
- Net-worth conversion, unconverted accounts, base fallback, and privacy masking.

## 8. Quality gate and deploy

- Run `pnpm run lint`.
- Run `pnpm run typecheck`.
- Run `pnpm run test`.
- Run `pnpm run db:check`.
- Keep the final commit eligible for the Docker image build/push hook.
- Do not push docs-only changes alone.
- Post-deploy verify:
  - Same-asset transfers behave as before.
  - Cross-asset transfers show both amounts and frozen rate.
  - Base currency selection works.
  - Mixed-currency net worth converts or explicitly lists unconverted accounts.
  - Analytics exclude legs while retaining qualifying fees.

## Implementation order

1. Schema and registry support.
2. Reactive capture and frozen rate.
3. Display, edit, and delete behavior.
4. Budgets and insights exclusions.
5. Net worth and Settings base currency.
6. Tests and quality gate.
7. Deploy verification.
