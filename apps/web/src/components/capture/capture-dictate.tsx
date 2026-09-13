"use client";

import { Check, X } from "lucide-react";

export interface CaptureDictateProps {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

/**
 * cavetail: dictate-mode body for the amount hero. iOS Safari/PWA exposes no
 * Web Speech API, so dictation arrives through the system keyboard's mic key
 * — which requires a real focused text input (the hero normally renders a
 * read-only span on mobile). Parsing stays fully on-device; see dictate.ts.
 */
export const CaptureDictate = ({ value, onChange, onCommit, onCancel }: CaptureDictateProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-1 py-1">
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <input
        type="text"
        aria-label="Dictate transaction"
        autoFocus
        autoComplete="off"
        autoCapitalize="sentences"
        enterKeyHint="done"
        placeholder="Lunch 500 pesos"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onCommit();
          if (e.key === "Escape") onCancel();
        }}
        className="min-w-0 flex-1 border-0 bg-transparent font-display text-inherit outline-none placeholder:text-zinc-600 focus:ring-0"
      />
      <button
        type="button"
        aria-label="Apply dictation"
        onClick={onCommit}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-(--radius-sm) bg-(--accent) text-(--accent-foreground) transition-[filter,transform] duration-150 ease-out hover:brightness-110 active:scale-95 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
      >
        <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Cancel dictation"
        onClick={onCancel}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-(--radius-sm) text-zinc-500 transition-colors hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
    <p className="truncate text-xs font-normal text-zinc-500">
      Tap the keyboard mic and speak — amount, what, where
    </p>
  </div>
);
