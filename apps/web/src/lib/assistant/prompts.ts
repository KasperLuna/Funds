import type { AssistantSnapshot } from "./serialize";
import type { UseCaseId } from "./types";

/**
 * Build the system prompt for the assistant. The system prompt establishes
 * identity, declares the contract (JSON only, schema-validated), and
 * enumerates the available use-case shapes.
 *
 * cavetail: the prompt is small on purpose. Larger system prompts eat into
 * the 1.5B model's context and degrade JSON-mode reliability. We do the
 * schema-narrowing work in the handler (which re-derives money from local
 * rows) rather than asking the model to compute it.
 */
const SHAPE_BLOCKS: Record<UseCaseId, string> = {
  spending_query: `For spending breakdowns, return JSON of shape:
  {"type":"spending_breakdown","periodLabel":"This month","assetCode":"PHP","decimals":2,"totalMinor":"12540","slices":[{"category":"Food","amountMinor":"4200","pct":33}]}`,
  budget_check: `For budget checks, return JSON of shape:
  {"type":"budget_progress","category":"Dining","spentMinor":"3120","limitMinor":"4000","periodLabel":"This month","pctUsed":78,"status":"near","assetCode":"PHP","decimals":2}`,
  weekly_summary: `For weekly/monthly summaries, return JSON of shape:
  {"type":"summary_dashboard","periodLabel":"This week","assetCode":"PHP","decimals":2,"incomeMinor":"12000","expenseMinor":"7400","netMinor":"4600","topCategories":[{"category":"Food","amountMinor":"2200","pct":30}],"budgets":[{"category":"Dining","pctUsed":78,"status":"near"}]}`,
  voice_to_txn: `For voice-to-transaction entries, return JSON of shape:
  {"type":"voice_to_txn","accountId":null,"accountName":"BPI","amountInput":"42.50","amountMinor":"4250","currency":"PHP","categoryIds":[],"description":"lunch","confidence":0.6}`,
  fallback_text: `If you cannot answer as a structured widget, return JSON of shape:
  {"type":"text","content":"short text answer"}`,
};

export function buildSystemPrompt(): string {
  return `You are Funds Assistant, an on-device helper for a personal finance app. You run entirely on the user's device; no data leaves it.

Hard rules:
- Respond with ONLY a single JSON object. No prose, no markdown, no preamble.
- Use the snapshot of accounts and categories to pick the right ids/names. Match names case-insensitively.
- Never invent transaction amounts. If the user did not give an amount, return a "voice_to_txn" shape with amountMinor: null and amountInput: null.
- Money values are decimal STRINGS in minor units (e.g. "4250" = ₱42.50 when decimals=2). Never use float fields for money.
- Choose the schema that best matches the user's question. Do not mix schemas.

Available schemas:
${SHAPE_BLOCKS.spending_query}

${SHAPE_BLOCKS.budget_check}

${SHAPE_BLOCKS.weekly_summary}

${SHAPE_BLOCKS.voice_to_txn}

${SHAPE_BLOCKS.fallback_text}`;
}

export function buildUserPrompt(args: {
  userText: string;
  snapshot: AssistantSnapshot;
}): string {
  return JSON.stringify({
    user: args.userText,
    snapshot: args.snapshot,
  });
}

export function buildCorrectivePrompt(previousError: string): string {
  return `Your previous output did not validate against the schema: ${previousError}. Re-emit a single JSON object that conforms to one of the schemas in the system prompt.`;
}
