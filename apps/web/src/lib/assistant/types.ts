/**
 * Wire format for an assistant chat thread. The orchestrator produces
 * AssistantMessage values; the renderer switches on `type` to pick a fixed
 * component (no dynamic JSX from the model). Money is intentionally a
 * `*Minor` decimal STRING everywhere it crosses the model boundary — the model
 * never sees BigInt and the handler/renderer are the only places that
 * re-parse it.
 */
export type UseCaseId =
  | "spending_query"
  | "budget_check"
  | "voice_to_txn"
  | "compare_query"
  | "merchants_query"
  | "burn_query"
  | "search_query"
  | "fallback_text";

/** Common flags surfaced as a small "includes archived / excluded" badge. */
export type ScopeFlags = {
  includesArchived: boolean;
  includesExcluded: boolean;
};

export type BudgetProgressPayload = {
  type: "budget_progress";
  category: string;
  spentMinor: string;
  limitMinor: string;
  periodLabel: string;
  pctUsed: number;
  status: "under" | "near" | "over";
  assetCode: string;
  decimals: number;
  scope?: ScopeFlags;
};

export type TopTxnPayload = {
  description: string;
  amountMinor: string;
  dateLabel: string;
};

export type SpendingSlicePayload = {
  category: string;
  amountMinor: string;
  pct: number;
};

export type SpendingBreakdownPayload = {
  type: "spending_breakdown";
  periodLabel: string;
  assetCode: string;
  decimals: number;
  totalMinor: string;
  slices: SpendingSlicePayload[];
  /** Optional biggest single expense inside the period (for narrative). */
  topTxn?: TopTxnPayload;
  /** Per-day spend in chronological order, in major units. */
  dailyTrend?: Array<{ day: string; amountMinor: string }>;
  scope?: ScopeFlags;
};

export type VoiceTxnPrefillPayload = {
  type: "voice_to_txn";
  accountId: string | null;
  accountName: string | null;
  amountInput: string | null;
  amountMinor: string | null;
  currency: string | null;
  categoryIds: string[];
  description: string;
  confidence: number;
};

export type PeriodComparePayload = {
  type: "period_compare";
  category: string | null;
  currentLabel: string;
  priorLabel: string;
  assetCode: string;
  decimals: number;
  currentMinor: string;
  priorMinor: string;
  /** Positive = spent more now, negative = spent less. Null when prior is 0. */
  deltaPct: number | null;
  scope?: ScopeFlags;
};

export type MerchantItemPayload = {
  description: string;
  amountMinor: string;
  count: number;
};

export type MerchantBreakdownPayload = {
  type: "merchant_breakdown";
  periodLabel: string;
  category: string | null;
  assetCode: string;
  decimals: number;
  totalMinor: string;
  merchants: MerchantItemPayload[];
  scope?: ScopeFlags;
};

export type BurnRatePayload = {
  type: "burn_rate";
  periodLabel: string;
  assetCode: string;
  decimals: number;
  currentMinor: string;
  priorMonthMinor: string;
  dailyAverageMinor: string;
  daysElapsed: number;
  daysInPeriod: number;
  /** Projected end-of-period spend (currentPace * daysInPeriod). */
  projectedMinor: string;
  /** Positive = on track to spend more than prior. */
  vsPriorPct: number | null;
  scope?: ScopeFlags;
};

export type SearchHitPayload = {
  description: string;
  amountMinor: string;
  dateLabel: string;
  categoryName: string | null;
  accountName: string | null;
};

export type SearchResultsPayload = {
  type: "search_results";
  periodLabel: string;
  /** The free-text pattern that was searched (already lowercased). */
  query: string;
  category: string | null;
  assetCode: string;
  decimals: number;
  count: number;
  totalMinor: string;
  hits: SearchHitPayload[];
  scope?: ScopeFlags;
};

/**
 * Suggested alternative use cases for an "I can help with…" affordance.
 * Used by the unsupported-intent path: when the user's question is
 * outside what the assistant can answer, we render a `text` payload
 * with a chip row of these.
 */
export type TextPayload = {
  type: "text";
  content: string;
  suggestedUseCases?: UseCaseId[];
};

type AssistantBase = {
  id: string;
  role: "assistant";
  ts: number;
  usedCase: UseCaseId;
  /** Optional failure note — set when a widget was derived without model help. */
  notice?: string;
  /**
   * Optional headline line for the message. Computed deterministically
   * from the validated payload — no second LLM call. The renderer
   * displays it as a single sentence at the top of every widget.
   */
  tldr?: string;
  /**
   * Verbatim model generations for every round of this request, kept in the
   * transcript for debugging (the widget replaces the streamed text, but the
   * raw output stays attached and renders collapsed in the bubble).
   */
  rawOutput?: string;
};

export type AssistantMessage =
  | (AssistantBase & BudgetProgressPayload)
  | (AssistantBase & SpendingBreakdownPayload)
  | (AssistantBase & VoiceTxnPrefillPayload)
  | (AssistantBase & PeriodComparePayload)
  | (AssistantBase & MerchantBreakdownPayload)
  | (AssistantBase & BurnRatePayload)
  | (AssistantBase & SearchResultsPayload)
  | (AssistantBase & TextPayload)
  | { id: string; role: "assistant"; type: "error"; reason: string; rawOutput?: string; ts: number; usedCase: UseCaseId; notice?: string; tldr?: string };

export type UserMessage = {
  id: string;
  role: "user";
  content: string;
  ts: number;
};

export type ChatMessage = UserMessage | AssistantMessage;

export type ChatStatus = "idle" | "thinking" | "loading-model";
