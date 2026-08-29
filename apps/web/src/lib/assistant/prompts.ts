import type { AssistantSnapshot } from "./serialize";
import { QUERY_LANGUAGE_DOC, QUERY_EXAMPLES } from "./queries";

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
