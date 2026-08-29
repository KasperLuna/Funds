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

export type AssistantMessage =
  | ({ id: string; role: "assistant"; ts: number; usedCase: UseCaseId } & BudgetProgressPayload)
  | ({ id: string; role: "assistant"; ts: number; usedCase: UseCaseId } & SpendingBreakdownPayload)
  | ({ id: string; role: "assistant"; ts: number; usedCase: UseCaseId } & SummaryDashboardPayload)
  | ({ id: string; role: "assistant"; ts: number; usedCase: UseCaseId } & VoiceTxnPrefillPayload)
  | ({ id: string; role: "assistant"; ts: number; usedCase: UseCaseId; type: "text" } & FallbackTextPayload)
  | { id: string; role: "assistant"; type: "error"; reason: string; ts: number; usedCase: UseCaseId };

export type UserMessage = {
  id: string;
  role: "user";
  content: string;
  ts: number;
};

export type ChatMessage = UserMessage | AssistantMessage;

export type ChatStatus = "idle" | "thinking" | "loading-model";
