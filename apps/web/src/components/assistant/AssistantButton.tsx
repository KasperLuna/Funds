"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AssistantSheet } from "./AssistantSheet";
import { cn } from "@/lib/utils";

/**
 * Floating action button that opens the assistant chat sheet on mobile,
 * or an inline panel on desktop. Mounted once in the dashboard layout.
 * The button is always visible (model download happens on first use) but
 * the sheet surfaces the capability error if the device can't run the model.
 */
export function AssistantButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open assistant"
        className={cn(
          "fixed z-30 flex h-12 w-12 items-center justify-center rounded-full bg-(--accent) text-(--accent-foreground) shadow-lg transition-[transform,filter] hover:scale-105 hover:brightness-110 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none active:scale-95 md:bottom-6 md:right-6 bottom-20 right-4",
          className,
        )}
      >
        <Sparkles className="h-5 w-5" aria-hidden />
      </button>
      <AssistantSheet open={open} onClose={() => setOpen(false)} />
    </>
  );
}
