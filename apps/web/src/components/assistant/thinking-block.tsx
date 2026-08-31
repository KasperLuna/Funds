"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingBlockProps {
  text: string;
}

export const ThinkingBlock = ({ text }: ThinkingBlockProps) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-(--radius-md) border border-(--border) bg-(--surface-2) text-xs">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-zinc-400 hover:text-zinc-300"
      >
        <ChevronDown
          className={cn("h-3 w-3 transition-transform", open && "rotate-180")}
          aria-hidden
        />
        <span className="font-medium">Thinking</span>
        <span className="ml-auto text-[10px] text-zinc-500">
          {text.split(/\s+/).length} tokens
        </span>
      </button>
      {open && (
        <div className="border-t border-(--border) px-3 py-2">
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-relaxed text-zinc-500">
            {text}
          </pre>
        </div>
      )}
    </div>
  );
};
