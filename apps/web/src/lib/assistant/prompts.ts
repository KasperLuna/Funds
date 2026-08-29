import type { AssistantSnapshot } from "./serialize";
import { QUERY_LANGUAGE_DOC, QUERY_EXAMPLES } from "./queries";
import type { AssistantMessage } from "./types";

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
- If the user names a period ("last month"), put it in "period".`;
}

export function buildUserPrompt(args: {
  userText: string;
  snapshot: AssistantSnapshot;
}): string {
  return JSON.stringify({ user: args.userText, snapshot: args.snapshot });
}

export function buildCorrectivePrompt(previousRaw: string): string {
  return `Your previous output was not a valid query: ${previousRaw.slice(0, 200)}. Reply with exactly ONE JSON object in one of the shapes from the system prompt.`;
}

// ---------------------------------------------------------------------------
// TL;DR (second model call): produces a one-sentence summary of the widget
// payload that the model has already validated and the renderer will display.
// ---------------------------------------------------------------------------

/**
 * TLDR_SYSTEM: short, narrow, single-purpose. The model sees only the
 * validated payload as a small JSON object (no row data, no money strings
 * beyond what the widget itself will show), so a hallucination can only
 * produce a slightly-off summary sentence — it cannot change the numbers
 * the user sees. Plain prose, ≤20 words, calm tone.
 */
export const TLDR_SYSTEM = `You write a single-sentence headline that summarises a personal-finance result for the user.

Rules:
- Be SPECIFIC: use the numbers already given to you (the user does not want vague language).
- ONE sentence, ≤20 words. No exclamation marks. No emojis.
- Tone: calm, direct, second person ("You", not "The user").
- Reply with a JSON object: {"tldr":"<one sentence>"}.`;

/** Build the small payload-only summary the TLDR model sees. */
export function payloadSummary(message: AssistantMessage): string {
  // The model only needs a denormalised view of the widget — never the raw
  // rows, never BigInts. Strip fields that don't add narrative value.
  const out: Record<string, unknown> = { type: message.type };
  if ("periodLabel" in message) out.period = (message as { periodLabel: string }).periodLabel;
  if ("currentLabel" in message)
    out.currentLabel = (message as { currentLabel: string }).currentLabel;
  if ("priorLabel" in message)
    out.priorLabel = (message as { priorLabel: string }).priorLabel;
  if (message.type === "spending_breakdown") {
    const m = message;
    out.totalMinor = m.totalMinor;
    out.slices = m.slices.slice(0, 5).map((s) => ({
      category: s.category,
      amountMinor: s.amountMinor,
      pct: s.pct,
    }));
    if (m.topTxn) out.topTxn = m.topTxn;
  } else if (message.type === "summary_dashboard") {
    out.incomeMinor = message.incomeMinor;
    out.expenseMinor = message.expenseMinor;
    out.netMinor = message.netMinor;
    out.savingsRatePct = message.savingsRatePct;
  } else if (message.type === "budget_progress") {
    out.category = message.category;
    out.spentMinor = message.spentMinor;
    out.limitMinor = message.limitMinor;
    out.pctUsed = message.pctUsed;
  } else if (message.type === "period_compare") {
    out.currentMinor = message.currentMinor;
    out.priorMinor = message.priorMinor;
    out.deltaPct = message.deltaPct;
  } else if (message.type === "merchant_breakdown") {
    out.totalMinor = message.totalMinor;
    out.merchants = message.merchants.slice(0, 5).map((m) => ({
      description: m.description,
      amountMinor: m.amountMinor,
      count: m.count,
    }));
  } else if (message.type === "recurring_list") {
    out.totalMonthlyMinor = message.totalMonthlyMinor;
    out.items = message.items.slice(0, 5).map((i) => ({
      description: i.description,
      monthlyCostMinor: i.monthlyCostMinor,
      cadence: i.cadence,
    }));
  } else if (message.type === "burn_rate") {
    out.currentMinor = message.currentMinor;
    out.projectedMinor = message.projectedMinor;
    out.dailyAverageMinor = message.dailyAverageMinor;
    out.vsPriorPct = message.vsPriorPct;
  } else if (message.type === "anomaly_list") {
    out.items = message.items.slice(0, 3).map((i) => ({
      description: i.description,
      amountMinor: i.amountMinor,
      multipleOfMedian: i.multipleOfMedian,
    }));
  }
  return JSON.stringify(out);
}

export function buildTldrPrompt(args: {
  userText: string;
  message: AssistantMessage;
}): string {
  return `User question: ${args.userText}
Result: ${payloadSummary(args.message)}

Write a one-sentence headline for the user. Reply with JSON: {"tldr":"<one sentence>"}.`;
}
