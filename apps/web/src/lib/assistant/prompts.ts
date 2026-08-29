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

READ THESE RULES FIRST:
1. The user message may include a "Resolved" line that tells you what the user's
   words mean in THIS app's vocabulary. USE THE RESOLVED VALUES, not the user's
   literal words.
   - "Resolved: category=Work, q=payroll" means the user said something like
     "what was my payroll" — emit {"select":"search","q":"payroll","category":"Work"}.
   - "Resolved: category=Food" means the user said "dining", "groceries",
     "restaurants", etc. — emit {"category":"Food",...} (the REAL category name).
   - If the "Resolved" line is empty, infer from the categories in the snapshot.
2. Match category and account names against the snapshot in the user message
   (case-insensitive). The snapshot also pre-injects the resolved category at
   the top of the categories list if it would otherwise be hidden by the size cap.
3. NEVER invent or include money amounts in the query. The app computes all figures.
4. If the user names a period ("last month"), put it in "period".`;
}

export function buildUserPrompt(args: {
  userText: string;
  snapshot: AssistantSnapshot;
}): string {
  // A single-line "Resolved: ..." header at the top of the user message
  // is the most reliable way to steer a 1B model. Only emit it when
  // something was actually resolved — an empty header confuses the model
  // into thinking there is a category it should reference.
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
// TL;DR (second model call): produces a one-sentence summary of the widget
// payload that the model has already validated and the renderer will display.
// ---------------------------------------------------------------------------

/**
 * Convert a minor-units BigInt string into a major-units number using the
 * asset's `decimals`. The codebase's invariant is: money crosses the wire
 * as a minor-units string (no float, no BigInt in the LLM context). For the
 * TL;DR prompt, we project the figure back into a plain Number in major
 * units so a 1B model does not have to do "12540 / 100" arithmetic in its
 * head — small models reliably fail at that and emit headlines like
 * "You spent ₱12540 this month". The model's hallucination ceiling here
 * stays at "the figure is wrong by some percentage", not "off by 100×".
 */
function minorToMajor(minor: string, decimals: number): number {
  const big = BigInt(minor);
  const denom = 10 ** Math.min(decimals, 18);
  // BigInt -> Number for the prompt only. Acceptable precision loss for a
  // narrative summary; the widget itself keeps BigInt.
  return Number(big) / denom;
}

/**
 * TLDR_SYSTEM: short, narrow, single-purpose. The model sees only the
 * validated payload as a small JSON object (no row data, no money strings
 * beyond what the widget itself will show), so a hallucination can only
 * produce a slightly-off summary sentence — it cannot change the numbers
 * the user sees. Plain prose, ≤20 words, calm tone.
 *
 * cavetail: money fields are pre-converted to MAJOR UNITS (e.g. 125.40,
 * not "12540") and the asset code is included so the model can format
 * amounts correctly. The model must NOT divide anything by 100.
 */
export const TLDR_SYSTEM = `You write a single-sentence headline that summarises a personal-finance result for the user.

Rules:
- Money fields are ALREADY in major units (e.g. 125.40 means ₱125.40). Do NOT divide by 100 or re-scale.
- The "asset" field tells you the currency code (PHP, USD, …); use its symbol or the code in your sentence.
- Be SPECIFIC: use the numbers already given to you (the user does not want vague language).
- ONE sentence, ≤20 words. No exclamation marks. No emojis.
- Tone: calm, direct, second person ("You", not "The user").
- Reply with a JSON object: {"tldr":"<one sentence>"}.`;

/** Build the small payload-only summary the TLDR model sees. */
export function payloadSummary(message: AssistantMessage): string {
  // The model only needs a denormalised view of the widget — never the raw
  // rows, never BigInts. Money is converted to major units here at the
  // prompt boundary so the model gets correct magnitudes.
  const out: Record<string, unknown> = { type: message.type };
  if ("periodLabel" in message) out.period = (message as { periodLabel: string }).periodLabel;
  if ("currentLabel" in message)
    out.currentLabel = (message as { currentLabel: string }).currentLabel;
  if ("priorLabel" in message)
    out.priorLabel = (message as { priorLabel: string }).priorLabel;
  if (message.type === "spending_breakdown") {
    const m = message;
    out.total = minorToMajor(m.totalMinor, m.decimals);
    out.slices = m.slices.slice(0, 5).map((s) => ({
      category: s.category,
      amount: minorToMajor(s.amountMinor, m.decimals),
      pct: s.pct,
    }));
    if (m.topTxn) {
      out.topTxn = {
        description: m.topTxn.description,
        amount: minorToMajor(m.topTxn.amountMinor, m.decimals),
        dateLabel: m.topTxn.dateLabel,
      };
    }
    out.asset = m.assetCode;
    out.decimals = m.decimals;
  } else if (message.type === "summary_dashboard") {
    out.income = minorToMajor(message.incomeMinor, message.decimals);
    out.expense = minorToMajor(message.expenseMinor, message.decimals);
    out.net = minorToMajor(message.netMinor, message.decimals);
    out.savingsRatePct = message.savingsRatePct;
    out.asset = message.assetCode;
    out.decimals = message.decimals;
  } else if (message.type === "budget_progress") {
    out.category = message.category;
    out.spent = minorToMajor(message.spentMinor, message.decimals);
    out.limit = minorToMajor(message.limitMinor, message.decimals);
    out.pctUsed = message.pctUsed;
    out.asset = message.assetCode;
    out.decimals = message.decimals;
  } else if (message.type === "period_compare") {
    out.current = minorToMajor(message.currentMinor, message.decimals);
    out.prior = minorToMajor(message.priorMinor, message.decimals);
    out.deltaPct = message.deltaPct;
    out.asset = message.assetCode;
    out.decimals = message.decimals;
  } else if (message.type === "merchant_breakdown") {
    out.total = minorToMajor(message.totalMinor, message.decimals);
    out.merchants = message.merchants.slice(0, 5).map((x) => ({
      description: x.description,
      amount: minorToMajor(x.amountMinor, message.decimals),
      count: x.count,
    }));
    out.asset = message.assetCode;
    out.decimals = message.decimals;
  } else if (message.type === "recurring_list") {
    out.totalMonthly = minorToMajor(message.totalMonthlyMinor, message.decimals);
    out.items = message.items.slice(0, 5).map((i) => ({
      description: i.description,
      monthlyCost: minorToMajor(i.monthlyCostMinor, message.decimals),
      cadence: i.cadence,
    }));
    out.asset = message.assetCode;
    out.decimals = message.decimals;
  } else if (message.type === "burn_rate") {
    out.current = minorToMajor(message.currentMinor, message.decimals);
    out.projected = minorToMajor(message.projectedMinor, message.decimals);
    out.dailyAverage = minorToMajor(message.dailyAverageMinor, message.decimals);
    out.vsPriorPct = message.vsPriorPct;
    out.asset = message.assetCode;
    out.decimals = message.decimals;
  } else if (message.type === "anomaly_list") {
    out.items = message.items.slice(0, 3).map((i) => ({
      description: i.description,
      amount: minorToMajor(i.amountMinor, message.decimals),
      multipleOfMedian: i.multipleOfMedian,
    }));
    out.asset = message.assetCode;
    out.decimals = message.decimals;
  }
  return JSON.stringify(out);
}

export function buildTldrPrompt(args: {
  userText: string;
  message: AssistantMessage;
}): string {
  return `User question: ${args.userText}
Result: ${payloadSummary(args.message)}

Write a one-sentence headline for the user. Money is already in major units (e.g. 125.40 = ₱125.40). Reply with JSON: {"tldr":"<one sentence>"}.`;
}
