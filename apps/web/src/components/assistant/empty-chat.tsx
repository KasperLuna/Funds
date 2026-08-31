"use client";

import { Sparkles } from "lucide-react";

interface EmptyChatProps {
  onPick: (text: string) => void;
}

export const EmptyChat = ({ onPick }: EmptyChatProps) => {
  const suggestions = [
    "How much did I spend on Food this month?",
    "Am I on track this month?",
    "Find my payroll transactions.",
  ];
  return (
    <div className="flex flex-col items-center gap-3 pt-4 text-center">
      <div className="rounded-full bg-(--surface-2) p-2.5" aria-hidden>
        <Sparkles className="h-5 w-5 text-(--accent)" />
      </div>
      <div>
        <p className="text-sm font-semibold">Ask about your money</p>
        <p className="mt-0.5 max-w-xs text-xs text-zinc-500">
          Everything runs on this device. No data leaves the phone.
        </p>
      </div>
      <ul className="flex w-full flex-col gap-1.5">
        {suggestions.map((s) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => onPick(s)}
              className="w-full rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-(--surface-3) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
            >
              {s}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
