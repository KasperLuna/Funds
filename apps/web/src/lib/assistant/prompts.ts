import type { AssistantSnapshot } from "./serialize";
import { QUERY_LANGUAGE_DOC, QUERY_EXAMPLES } from "./queries";
import { assetSymbol } from "@/lib/money";
import type { AssistantMessage, PeriodComparePayload, SearchResultsPayload, SpendingBreakdownPayload } from "./types";

/**
 * System prompt: the model is a QUERY GENERATOR, not a chat assistant. It
 * translates the question into one JSON query object; the data layer computes
 * everything. Few-shot examples are the main reliability lever for 1B models.
 *
 * cavetail: the prompt is small on purpose — larger prompts degrade JSON-mode
 * reliability on the 360M–1B models we run. No money values exist anywhere in
 * the query language, so a hallucinating model cannot fabricate figures.
 */
export function buildSystemPrompt(): string {
  return `You convert the user's question into ONE query for a personal finance app.

Reply with ONLY a single JSON object. Choose one shape:
${QUERY_LANGUAGE_DOC}

period is one of: this_month, last_month, this_week, last_week, 30d, this_year, last_year.

Examples:
${QUERY_EXAMPLES}

Rules:
- Match category and account names against the snapshot in the user message (case-insensitive).
- NEVER invent or include money amounts in the query. The app computes all figures from its own data.
- If the user names a period ("last month"), put it in "period".
- The snapshot may include a "resolved" object — if so, USE the resolved category
  name (not the user's literal word) so the query matches a real category. If
  the snapshot includes a "descriptionPattern", the user is asking about a
  description (e.g. "payroll", "amazon") — emit a search query with that
  pattern in "q".`;
}

export function buildUserPrompt(args: {
  userText: string;
  snapshot: AssistantSnapshot;
}): string {
  const r = args.snapshot.resolved;
  const tokens = [
    r?.category ? `category=${r.category}` : null,
    r?.descriptionPattern ? `q=${r.descriptionPattern}` : null,
  ].filter((t): t is string => Boolean(t));
  const hint = tokens.length > 0 ? `Resolved: ${tokens.join(", ")}\n\n` : "";
  return hint + JSON.stringify({ user: args.userText, snapshot: args.snapshot });
}

export function buildCorrectivePrompt(previousRaw: string): string {
  return `Your previous output was not a valid query: ${previousRaw.slice(0, 200)}. Reply with exactly ONE JSON object in one of the shapes from the system prompt.`;
}

// ---------------------------------------------------------------------------
// Deterministic headline (TL;DR) — replaces the previous second LLM call.
// Computes a one-sentence summary from the validated payload only. Money is
// re-derived from `*Minor` strings using the widget's own `assetCode` and
// `decimals` so the symbol matches the rest of the UI.
// ---------------------------------------------------------------------------

function minorToMajor(minor: string, decimals: number): number {
  const big = BigInt(minor);
  const denom = 10 ** Math.min(decimals, 18);
  return Number(big) / denom;
}

function fmtAmount(minor: string, decimals: number, code: string): string {
  const major = minorToMajor(minor, decimals);
  // Asset symbol prefix is only useful when it's not "$" — the dollar
  // sign is just noise on the headline.
  const prefix = code === "USD" ? "" : assetSymbol(code);
  return `${prefix}${major.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

function spendingHeadline(p: SpendingBreakdownPayload): string | null {
  if (p.slices.length === 0) return null;
  const total = fmtAmount(p.totalMinor, p.decimals, p.assetCode);
  if (p.slices.length === 1 && p.slices[0]) {
    return `Spent ${total} on ${p.slices[0].category}.`;
  }
  return `Spent ${total} across ${p.slices.length} categories.`;
}

function periodCompareHeadline(p: PeriodComparePayload): string | null {
  if (p.deltaPct === null) return `No comparable spend in ${p.priorLabel}.`;
  const abs = Math.abs(p.deltaPct);
  const dir = p.deltaPct > 0 ? "Up" : "Down";
  return `${dir} ${abs}% vs ${p.priorLabel}.`;
}

function burnHeadline(p: import("./types").BurnRatePayload): string | null {
  if (p.vsPriorPct === null) return null;
  const dir = p.vsPriorPct > 0 ? "more" : "less";
  return `On pace to spend ${Math.abs(p.vsPriorPct)}% ${dir} than last month.`;
}

function searchHeadline(p: SearchResultsPayload): string | null {
  if (p.count === 0) return null;
  return `${p.count} match${p.count === 1 ? "" : "es"} for "${p.query}".`;
}

function merchantHeadline(p: import("./types").MerchantBreakdownPayload): string | null {
  if (p.merchants.length === 0) return null;
  if (p.merchants.length === 1 && p.merchants[0]) {
    return `Top: ${p.merchants[0].description}.`;
  }
  const [a, b] = p.merchants;
  if (!a || !b) return null;
  return `Top: ${a.description} ${fmtAmount(a.amountMinor, p.decimals, p.assetCode)}, ${b.description} ${fmtAmount(b.amountMinor, p.decimals, p.assetCode)}.`;
}

function budgetHeadline(p: import("./types").BudgetProgressPayload): string | null {
  const pct = Math.round(p.pctUsed);
  const verb = p.status === "over" ? "Over" : p.status === "near" ? "Near" : "Under";
  return `${verb} budget on ${p.category} (${pct}%).`;
}

/**
 * Compute a one-sentence headline for a widget message. Returns null when
 * the widget type doesn't get a headline (text, error, voice_to_txn).
 *
 * The widget is the source of truth — the headline is a one-line summary,
 * never a substitute for the actual numbers.
 */
export function deriveTldr(message: AssistantMessage): string | null {
  switch (message.type) {
    case "spending_breakdown":
      return spendingHeadline(message);
    case "period_compare":
      return periodCompareHeadline(message);
    case "burn_rate":
      return burnHeadline(message);
    case "search_results":
      return searchHeadline(message);
    case "merchant_breakdown":
      return merchantHeadline(message);
    case "budget_progress":
      return budgetHeadline(message);
    case "voice_to_txn":
    case "text":
    case "error":
      return null;
  }
}
