import { z } from "zod";

/**
 * Per-use-case Zod schemas. Each schema is a closed shape; the model is
 * prompted (and where possible, grammar-constrained) to emit only JSON that
 * validates. The handler signature is `(payload, ctx) => AssistantMessage`
 * and runs ONLY after `schema.safeParse` succeeds.
 */
const sliceShape = z.object({
  category: z.string().min(1).max(80),
  amountMinor: z.string().regex(/^-?\d+$/),
  pct: z.number().min(0).max(100),
});

const scopeShape = z
  .object({
    includesArchived: z.boolean(),
    includesExcluded: z.boolean(),
  })
  .optional();

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
  scope: scopeShape,
});

export const spendingSliceSchema = sliceShape;

export const topTxnSchema = z.object({
  description: z.string().min(1).max(200),
  amountMinor: z.string().regex(/^\d+$/),
  dateLabel: z.string().min(1).max(40),
});

export const spendingBreakdownSchema = z.object({
  type: z.literal("spending_breakdown"),
  periodLabel: z.string().min(1).max(40),
  assetCode: z.string().min(1).max(8),
  decimals: z.number().int().min(0).max(18),
  totalMinor: z.string().regex(/^\d+$/),
  slices: z.array(spendingSliceSchema).min(1).max(12),
  topTxn: topTxnSchema.optional(),
  dailyTrend: z
    .array(
      z.object({
        day: z.string().min(1).max(20),
        amountMinor: z.string().regex(/^\d+$/),
      }),
    )
    .max(120)
    .optional(),
  scope: scopeShape,
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

export const periodCompareSchema = z.object({
  type: z.literal("period_compare"),
  category: z.string().nullable(),
  currentLabel: z.string().min(1).max(40),
  priorLabel: z.string().min(1).max(60),
  assetCode: z.string().min(1).max(8),
  decimals: z.number().int().min(0).max(18),
  currentMinor: z.string().regex(/^\d+$/),
  priorMinor: z.string().regex(/^\d+$/),
  deltaPct: z.number().min(-1000).max(10000).nullable(),
  scope: scopeShape,
});

export const merchantBreakdownSchema = z.object({
  type: z.literal("merchant_breakdown"),
  periodLabel: z.string().min(1).max(40),
  category: z.string().nullable(),
  assetCode: z.string().min(1).max(8),
  decimals: z.number().int().min(0).max(18),
  totalMinor: z.string().regex(/^\d+$/),
  merchants: z
    .array(
      z.object({
        description: z.string().min(1).max(200),
        amountMinor: z.string().regex(/^\d+$/),
        count: z.number().int().min(1).max(9999),
      }),
    )
    .min(1)
    .max(12),
  scope: scopeShape,
});

export const burnRateSchema = z.object({
  type: z.literal("burn_rate"),
  periodLabel: z.string().min(1).max(40),
  assetCode: z.string().min(1).max(8),
  decimals: z.number().int().min(0).max(18),
  currentMinor: z.string().regex(/^\d+$/),
  priorMonthMinor: z.string().regex(/^\d+$/),
  dailyAverageMinor: z.string().regex(/^\d+$/),
  daysElapsed: z.number().int().min(1).max(366),
  daysInPeriod: z.number().int().min(1).max(366),
  projectedMinor: z.string().regex(/^\d+$/),
  vsPriorPct: z.number().min(-1000).max(10000).nullable(),
  scope: scopeShape,
});

export const searchResultsSchema = z.object({
  type: z.literal("search_results"),
  periodLabel: z.string().min(1).max(40),
  query: z.string().min(1).max(80),
  category: z.string().nullable(),
  assetCode: z.string().min(1).max(8),
  decimals: z.number().int().min(0).max(18),
  count: z.number().int().min(0).max(9999),
  totalMinor: z.string().regex(/^-?\d+$/),
  hits: z
    .array(
      z.object({
        description: z.string().min(1).max(200),
        amountMinor: z.string().regex(/^-?\d+$/),
        dateLabel: z.string().min(1).max(40),
        categoryName: z.string().nullable(),
        accountName: z.string().nullable(),
      }),
    )
    .max(50),
  scope: scopeShape,
});

export const schemaByUseCase = {
  spending_query: spendingBreakdownSchema,
  budget_check: budgetProgressSchema,
  voice_to_txn: voiceTxnPrefillSchema,
  compare_query: periodCompareSchema,
  merchants_query: merchantBreakdownSchema,
  burn_query: burnRateSchema,
  search_query: searchResultsSchema,
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
