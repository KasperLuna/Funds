import { z } from "zod";

/**
 * Per-use-case Zod schemas. Each schema is a closed shape; the model is
 * prompted (and where possible, grammar-constrained) to emit only JSON that
 * validates. The handler signature is `(payload, ctx) => AssistantMessage`
 * and runs ONLY after `schema.safeParse` succeeds.
 */
export const budgetProgressSchema = z.object({
  type: z.literal("budget_progress"),
  category: z.string().min(1).max(80),
  spentMinor: z.string().regex(/^\d+$/),
  limitMinor: z.string().regex(/^\d+$/),
  periodLabel: z.string().min(1).max(40),
  pctUsed: z.number().min(0).max(150),
  status: z.enum(["under", "near", "over"]),
  assetCode: z.string().min(1).max(8),
  decimals: z.number().int().min(0).max(18),
});

export const spendingSliceSchema = z.object({
  category: z.string().min(1).max(80),
  amountMinor: z.string().regex(/^\d+$/),
  pct: z.number().min(0).max(100),
});

export const spendingBreakdownSchema = z.object({
  type: z.literal("spending_breakdown"),
  periodLabel: z.string().min(1).max(40),
  assetCode: z.string().min(1).max(8),
  decimals: z.number().int().min(0).max(18),
  totalMinor: z.string().regex(/^\d+$/),
  slices: z.array(spendingSliceSchema).min(1).max(12),
});

export const summaryDashboardSchema = z.object({
  type: z.literal("summary_dashboard"),
  periodLabel: z.string().min(1).max(40),
  assetCode: z.string().min(1).max(8),
  decimals: z.number().int().min(0).max(18),
  incomeMinor: z.string().regex(/^\d+$/),
  expenseMinor: z.string().regex(/^\d+$/),
  netMinor: z.string().regex(/^-?\d+$/),
  topCategories: z.array(spendingSliceSchema).max(6),
  budgets: z
    .array(
      z.object({
        category: z.string().min(1).max(80),
        pctUsed: z.number().min(0).max(150),
        status: z.enum(["under", "near", "over"]),
      }),
    )
    .max(8),
});

export const voiceTxnPrefillSchema = z.object({
  type: z.literal("voice_to_txn"),
  accountId: z.string().nullable(),
  accountName: z.string().nullable(),
  amountInput: z.string().nullable(),
  amountMinor: z.string().nullable(),
  currency: z.string().nullable(),
  categoryIds: z.array(z.string()),
  description: z.string().min(1).max(200),
  confidence: z.number().min(0).max(1),
});

export const schemaByUseCase = {
  spending_query: spendingBreakdownSchema,
  budget_check: budgetProgressSchema,
  weekly_summary: summaryDashboardSchema,
  voice_to_txn: voiceTxnPrefillSchema,
  fallback_text: z.object({ type: z.literal("text"), content: z.string().min(1) }),
} as const;

export type SchemaByUseCase = typeof schemaByUseCase;

/**
 * Extract the first JSON object substring from a model response. Tolerant of
 * leading prose, trailing commentary, and markdown fences — but if the model
 * emits multiple objects, only the first wins (callers should be specific in
 * their prompt).
 */
export function extractJson(raw: string): unknown | null {
  const trimmed = raw.trim();
  // Strip a leading markdown fence if present.
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const candidate: string = fenced?.[1] ?? trimmed;

  const firstBrace = candidate.indexOf("{");
  if (firstBrace < 0) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = firstBrace; i < candidate.length; i++) {
    const ch = candidate[i] as string;
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(firstBrace, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
