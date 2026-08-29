import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";
import { computeBudgetUsage } from "@/lib/categories/categories-store";
import { resolvePeriod, rangeToYearMonth, type PeriodRange } from "./period";

/**
 * The agent's tools. Each tool is a JSON-schema function the model may call
 * (via native WebLLM function-calling) plus a TypeScript executor that runs
 * the REAL query over local rows. The invariant from the old design holds:
 * the model only NAMES things (period, category, account); every money figure
 * is re-derived here from local transaction rows, never read from the model.
 *
 * Tool argument JSON from a 1B model must be treated as untrusted input —
 * executors validate and coerce, and never throw on a garbage arg.
 */

export type ToolCtx = {
  accounts: Account[];
  categories: Category[];
  categoryBudgets: CategoryBudget[];
  txns: Txn[];
  assetsById: Map<string, { code: string; decimals: number }>;
  now: number;
};

export type ToolSchema = {
  name: string;
  description: string;
  parameters: unknown;
};

export type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

type Executor = (args: unknown, ctx: ToolCtx) => ToolResult;

// ---------------------------------------------------------------------------
// Money helpers (minor BigInt, copied semantics from analytics/compute.ts)
// ---------------------------------------------------------------------------

function ensureBigInt(v: bigint | number | string): bigint {
  return typeof v === "bigint" ? v : BigInt(v);
}

function excludedIds(categories: Category[]): Set<string> {
  return new Set(
    categories.filter((c) => c.excludeFromAnalytics && !c.deletedAt).map((c) => c.id),
  );
}

function primaryAsset(ctx: ToolCtx): { code: string; decimals: number } {
  const first = ctx.accounts.find((a) => !a.archived && !a.deletedAt);
  if (first) {
    const a = ctx.assetsById.get(first.assetId);
    return { code: a?.code ?? "USD", decimals: a?.decimals ?? 2 };
  }
  return { code: "USD", decimals: 2 };
}

function findCategory(ctx: ToolCtx, name?: unknown): Category | null {
  if (typeof name !== "string" || !name.trim()) return null;
  const needle = name.trim().toLowerCase();
  return ctx.categories.find((c) => c.name.trim().toLowerCase() === needle) ?? null;
}

type Slice = { category: string; amountMinor: string; pct: number };

function categorySlicesForRange(
  ctx: ToolCtx,
  range: PeriodRange,
  categoryName?: string,
): { slices: Slice[]; totalMinor: bigint } {
  const catMap = new Map(ctx.categories.map((c) => [c.id, c]));
  const excl = excludedIds(ctx.categories);
  const totals = new Map<string, bigint>();
  let grandTotal = 0n;

  for (const t of ctx.txns) {
    if (t.deletedAt) continue;
    const date = Number(t.date);
    if (date < range.from || date > range.to) continue;
    const amt = ensureBigInt(t.amountMinor);
    if (amt >= 0n) continue;
    const spend = -amt;
    const totalCats = t.categoryIds.length;
    const included = t.categoryIds.filter((id) => !excl.has(id));
    if (totalCats === 0 || included.length === 0) continue;
    const share = (spend * BigInt(included.length)) / BigInt(totalCats);
    for (const catId of included) {
      totals.set(catId, (totals.get(catId) ?? 0n) + share);
    }
    grandTotal += share;
  }

  const slices: Slice[] = [];
  for (const [catId, total] of totals) {
    const cat = catMap.get(catId);
    if (!cat || cat.deletedAt) continue;
    slices.push({
      category: cat.name,
      amountMinor: total.toString(),
      pct: grandTotal > 0n ? Number((total * 10000n) / grandTotal) / 100 : 0,
    });
  }
  slices.sort((a, b) => (BigInt(a.amountMinor) > BigInt(b.amountMinor) ? -1 : 1));

  if (categoryName) {
    const needle = categoryName.trim().toLowerCase();
    const focused = slices.filter((s) => s.category.trim().toLowerCase() === needle);
    return {
      slices: (focused.length > 0 ? focused : slices).slice(0, 8),
      totalMinor: focused.length > 0 ? BigInt(focused[0]!.amountMinor) : grandTotal,
    };
  }

  const capped = slices.slice(0, 8);
  return { slices: capped, totalMinor: grandTotal };
}

function fmtMoney(v: bigint | number | string): string {
  return typeof v === "bigint" ? v.toString() : String(v);
}

/**
 * Convert a model-supplied decimal amount string ("42.50") to a minor-unit
 * BigInt string without ever touching floats (local/no-money-float). Truncates
 * extra fractional digits; returns null for anything non-numeric.
 */
function decimalStringToMinor(v: string, decimals: number): string | null {
  const s = v.trim().replace(/[^0-9.]/g, "");
  if (!s) return null;
  const [wholeRaw, fracRaw = ""] = s.split(".");
  const whole = wholeRaw ?? "";
  const frac = fracRaw ?? "";
  if (!/^\d*$/.test(whole) || !/^\d*$/.test(frac) || s.includes("..")) return null;
  const fracFixed = (frac + "0".repeat(decimals)).slice(0, decimals);
  return (BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(fracFixed || "0")).toString();
}

// ---------------------------------------------------------------------------
// Tool executors
// ---------------------------------------------------------------------------

const getSpending: Executor = (args, ctx) => {
  const a = (args ?? {}) as { period?: string; category?: string; account?: string };
  const range = resolvePeriod(a.period, ctx.now);
  const asset = primaryAsset(ctx);
  const { slices, totalMinor } = categorySlicesForRange(ctx, range, a.category);
  if (slices.length === 0) {
    return { ok: true, data: { type: "spending_empty", periodLabel: range.label } };
  }
  return {
    ok: true,
    data: {
      type: "spending_breakdown",
      periodLabel: range.label,
      assetCode: asset.code,
      decimals: asset.decimals,
      totalMinor: fmtMoney(totalMinor),
      slices,
    },
  };
};

const getBudget: Executor = (args, ctx) => {
  const a = (args ?? {}) as { category?: string; period?: string };
  const range = resolvePeriod(a.period, ctx.now);
  const { year, month } = rangeToYearMonth(range);
  const asset = primaryAsset(ctx);
  const usage = computeBudgetUsage(
    ctx.categories,
    ctx.categoryBudgets,
    ctx.txns as unknown as import("@/lib/categories/categories-store").BudgetTx[],
    year,
    month,
  ).filter((u) => u.budgetMinor > 0n);

  let chosen = usage[0] ?? null;
  if (a.category) {
    const needle = a.category.trim().toLowerCase();
    chosen = usage.find((u) => u.category.name.trim().toLowerCase() === needle) ?? chosen;
  }
  if (!chosen) {
    return { ok: true, data: { type: "budget_empty", periodLabel: range.label } };
  }
  const pct = Math.min(150, Math.round(Number((chosen.spentMinor * 10000n) / chosen.budgetMinor) / 100));
  return {
    ok: true,
    data: {
      type: "budget_progress",
      category: chosen.category.name,
      spentMinor: fmtMoney(chosen.spentMinor),
      limitMinor: fmtMoney(chosen.budgetMinor),
      periodLabel: range.label,
      pctUsed: pct,
      status: pct > 90 ? "over" : pct >= 70 ? "near" : "under",
      assetCode: asset.code,
      decimals: asset.decimals,
    },
  };
};

const getSummary: Executor = (args, ctx) => {
  const a = (args ?? {}) as { period?: string };
  const range = resolvePeriod(a.period, ctx.now);
  const asset = primaryAsset(ctx);
  const { year, month } = rangeToYearMonth(range);

  let income = 0n;
  let expense = 0n;
  for (const t of ctx.txns) {
    if (t.deletedAt) continue;
    const date = Number(t.date);
    if (date < range.from || date > range.to) continue;
    if (t.amountMinor >= 0n) income += t.amountMinor;
    else expense += -t.amountMinor;
  }
  const net = income - expense;

  const { slices } = categorySlicesForRange(ctx, range);
  const topCategories = slices.slice(0, 5);

  const usage = computeBudgetUsage(
    ctx.categories,
    ctx.categoryBudgets,
    ctx.txns as unknown as import("@/lib/categories/categories-store").BudgetTx[],
    year,
    month,
  )
    .filter((u) => u.budgetMinor > 0n)
    .sort((x, y) => y.pct - x.pct)
    .slice(0, 4)
    .map((u) => {
      const pct = Math.min(150, Math.round(Number((u.spentMinor * 10000n) / u.budgetMinor) / 100));
      return {
        category: u.category.name,
        pctUsed: pct,
        status: pct > 90 ? "over" : pct >= 70 ? "near" : "under",
      };
    });

  return {
    ok: true,
    data: {
      type: "summary_dashboard",
      periodLabel: range.label,
      assetCode: asset.code,
      decimals: asset.decimals,
      incomeMinor: fmtMoney(income),
      expenseMinor: fmtMoney(expense),
      netMinor: fmtMoney(net),
      topCategories,
      budgets: usage,
    },
  };
};

const listCategories: Executor = (_args, ctx) => {
  return {
    ok: true,
    data: {
      type: "categories_list",
      categories: ctx.categories
        .filter((c) => !c.deletedAt)
        .map((c) => ({ id: c.id, name: c.name })),
    },
  };
};

const logTransaction: Executor = (args, ctx) => {
  const a = (args ?? {}) as {
    account?: string;
    description?: string;
    amount?: string | number;
    currency?: string;
    category?: string;
  };
  const account = ctx.accounts.find(
    (ac) => !ac.archived && !ac.deletedAt && typeof a.account === "string" &&
      ac.name.trim().toLowerCase() === a.account.trim().toLowerCase(),
  ) ?? ctx.accounts.find((ac) => !ac.archived && !ac.deletedAt) ?? null;
  const category = findCategory(ctx, a.category);
  const amountInput =
    typeof a.amount === "number" || typeof a.amount === "string" ? String(a.amount) : null;
  const amountMinor =
    typeof a.amount === "number"
      ? decimalStringToMinor(String(a.amount), 2)
      : typeof a.amount === "string"
        ? decimalStringToMinor(a.amount, 2)
        : null;
  return {
    ok: true,
    data: {
      type: "voice_to_txn",
      accountId: account?.id ?? null,
      accountName: account?.name ?? (typeof a.account === "string" ? a.account : null),
      amountInput,
      amountMinor,
      currency: typeof a.currency === "string" ? a.currency : null,
      categoryIds: category ? [category.id] : [],
      description: typeof a.description === "string" ? a.description : "",
      confidence: 0.5,
    },
  };
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const TOOLS: Array<{ schema: ToolSchema; execute: Executor }> = [
  {
    schema: {
      name: "get_spending_breakdown",
      description:
        "Compute spending by category over a time period. Always call this to answer spending questions instead of guessing amounts.",
      parameters: {
        type: "object",
        properties: {
          period: { type: "string", description: "One of: this_month, last_month, this_week, last_week, 30d, this_year, last_year" },
          category: { type: "string", description: "Optional single category name to focus on" },
          account: { type: "string", description: "Optional account name" },
        },
      },
    },
    execute: getSpending,
  },
  {
    schema: {
      name: "get_budget_status",
      description: "Report spend vs budget for a category (or the most-used budget). Always call to answer budget questions.",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Optional category name" },
          period: { type: "string" },
        },
      },
    },
    execute: getBudget,
  },
  {
    schema: {
      name: "get_summary",
      description: "Income, expense, net, and top categories for a period. Call for weekly/monthly summaries or 'how am I doing'.",
      parameters: { type: "object", properties: { period: { type: "string" } } },
    },
    execute: getSummary,
  },
  {
    schema: {
      name: "list_categories",
      description: "Return the user's categories. Use when unsure which category the user means.",
      parameters: { type: "object", properties: {} },
    },
    execute: listCategories,
  },
  {
    schema: {
      name: "log_transaction",
      description: "Prepare a transaction entry (expense/income log) from the user's words.",
      parameters: {
        type: "object",
        properties: {
          account: { type: "string" },
          description: { type: "string" },
          amount: { type: "string" },
          currency: { type: "string" },
          category: { type: "string" },
        },
      },
    },
    execute: logTransaction,
  },
];

function findBySchemaName(name: string) {
  return TOOLS.find((t) => t.schema.name === name);
}

export function toolSchemas(): ToolSchema[] {
  return TOOLS.map((t) => ({
    name: t.schema.name,
    description: t.schema.description,
    parameters: t.schema.parameters,
  }));
}

/**
 * Execute a tool by name with the model-provided (untrusted) JSON args.
 * Returns a tagged result so the caller can distinguish "ran a query" from
 * "bad tool name". Never throws on bad input.
 */
export function executeTool(
  name: string,
  args: unknown,
  ctx: ToolCtx,
): ToolResult {
  const tool = findBySchemaName(name);
  if (!tool) {
    return { ok: false, error: `Unknown tool: ${name}` };
  }
  try {
    return tool.execute(args, ctx);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}