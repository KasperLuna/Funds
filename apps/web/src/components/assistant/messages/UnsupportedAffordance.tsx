"use client";

import type { UseCaseId } from "@/lib/assistant/types";

/**
 * Chip-row affordance for the "I can help with…" path. When the user's
 * question is outside the assistant's capability set, the chat engine
 * emits a `text` payload with `suggestedUseCases: UseCaseId[]`. Each chip
 * pre-fills the input with an example prompt for that use case and
 * submits, so the user gets a working example of the kind of question
 * the assistant CAN answer.
 */
const EXAMPLES: Partial<Record<UseCaseId, string>> = {
  spending_query: "How much did I spend on Food this month?",
  budget_check: "Am I over budget on Food?",
  compare_query: "Compare this month vs last month.",
  merchants_query: "Where does my Food money go?",
  burn_query: "Am I on track this month?",
  search_query: "Find my payroll transactions.",
  voice_to_txn: "Log a 42.50 lunch at BPI.",
};

export function UnsupportedAffordance({
  suggestedUseCases,
  onPick,
  disabled,
}: {
  suggestedUseCases: UseCaseId[];
  onPick: (text: string) => void;
  disabled?: boolean;
}) {
  if (suggestedUseCases.length === 0) return null;

  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" role="list">
      {suggestedUseCases.map((uc) => {
        const text = EXAMPLES[uc] ?? "";
        if (!text) return null;
        return (
          <li key={uc}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(text)}
              className="rounded-full border border-(--border) bg-(--surface-2) px-2.5 py-1 text-xs text-zinc-300 transition-colors hover:bg-(--surface-3) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none disabled:opacity-50"
            >
              {text}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
