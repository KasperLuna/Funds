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
  | "weekly_summary"
  | "voice_to_txn"
  | "fallback_text";

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
};

export type SummaryDashboardPayload = {
  type: "summary_dashboard";
  periodLabel: string;
  assetCode: string;
  decimals: number;
  incomeMinor: string;
  expenseMinor: string;
  netMinor: string;
  topCategories: SpendingSlicePayload[];
  budgets: Array<{
    category: string;
    pctUsed: number;
    status: "under" | "near" | "over";
  }>;
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

export type FallbackTextPayload = {
  type: "text";
  content: string;
};

type AssistantBase = {
  id: string;
  role: "assistant";
  ts: number;
  usedCase: UseCaseId;
  /** Optional failure note — set when a widget was derived without model help. */
  notice?: string;
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
  | (AssistantBase & SummaryDashboardPayload)
  | (AssistantBase & VoiceTxnPrefillPayload)
  | (AssistantBase & FallbackTextPayload)
  | { id: string; role: "assistant"; type: "error"; reason: string; rawOutput?: string; ts: number; usedCase: UseCaseId; notice?: string };

export type UserMessage = {
  id: string;
  role: "user";
  content: string;
  ts: number;
};

export type ChatMessage = UserMessage | AssistantMessage;

export type ChatStatus = "idle" | "thinking" | "loading-model";
