import { toolSchemas } from "./tools";

/**
 * System prompt for the tool-calling agent. The model's job is to PICK a tool
 * and NAME parameters (period, category, account) — never to compute or
 * invent money. All figures are derived by the tool executors from local
 * transaction rows.
 */
export function buildSystemPrompt(): string {
  return `You are Funds Assistant, an on-device helper for a personal finance app. No data leaves the device.

Hard rules:
- To answer ANY question about spending, budgets, balances, or summaries, you MUST call one of the provided tools. Never guess or compute amounts yourself.
- After a tool returns a result, the answer is rendered automatically. If you have the result you need, stop calling tools.
- Call a tool at most once per question unless the user asks a new question.
- For logging a transaction ("spent 50 on lunch"), call log_transaction.
- Only reply with plain text (no tool call) for greetings, thanks, or questions about what you can do.

User's snapshot (names only) is provided in the user message. Category names must match the snapshot exactly (case-insensitive).`;
}

/**
 * The tool definitions passed to the model on each turn. Wrapped in the
 * OpenAI-style envelope WebLLM expects.
 */
export function toolDefinitions(): Array<{
  type: "function";
  function: { name: string; description: string; parameters: unknown };
}> {
  return toolSchemas().map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

/**
 * Legacy shape hints kept for the JSON-compat path: when a small model skips
 * tool-calling and emits one of the old widget JSONs directly, we still
 * validate and render it. Kept terse.
 */
export const WIDGET_SHAPES_HINT = `Widget JSON shapes (only if NOT calling a tool):
{"type":"spending_breakdown","periodLabel":"...","assetCode":"PHP","decimals":2,"totalMinor":"12540","slices":[{"category":"Food","amountMinor":"4200","pct":33}]}
{"type":"budget_progress","category":"Dining","spentMinor":"3120","limitMinor":"4000","periodLabel":"This month","pctUsed":78,"status":"near","assetCode":"PHP","decimals":2}
{"type":"summary_dashboard","periodLabel":"This week","assetCode":"PHP","decimals":2,"incomeMinor":"12000","expenseMinor":"7400","netMinor":"4600","topCategories":[],"budgets":[]}
{"type":"voice_to_txn","accountId":null,"accountName":null,"amountInput":"42.50","amountMinor":"4250","currency":"PHP","categoryIds":[],"description":"lunch","confidence":0.6}`;

/** One-line nudge appended to the corrective retry. */
export function correctiveNote(): string {
  return "If the question needs data, call a tool instead. Otherwise reply with a short plain-text sentence.";
}

export function buildUserPrompt(args: {
  userText: string;
  snapshot: {
    tz: string;
    nowIso: string;
    accounts: Array<{ id: string; name: string; kind: string; assetCode: string }>;
    categories: Array<{ id: string; name: string }>;
  };
}): string {
  return JSON.stringify({ user: args.userText, snapshot: args.snapshot });
}

export function buildCorrectivePrompt(previousError: string): string {
  return `Your previous output was invalid: ${previousError}. ${correctiveNote()}`;
}
