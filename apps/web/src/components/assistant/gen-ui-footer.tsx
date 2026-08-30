"use client";

import { Sparkles, Database } from "lucide-react";
import { usePrivacy } from "@/lib/privacy/privacy-context";
import { cn } from "@/lib/utils";

interface GenUiFooterProps {
  updatedAt: number;
  onViewData?: () => void;
  className?: string;
}

/**
 * Footer shown on every GenUI widget. Two pieces of metadata, no more:
 *   1. Data source — explicit "from this device" so the user never confuses
 *      model output with a server-computed number.
 *   2. Privacy state — masked mode disables the dollar amounts visually.
 *
 * Spec §8 calls out "transparency: allow user to view/edit underlying data
 * behind any GenUI widget" — the ViewDataButton slot is the seam for that.
 */
export const GenUiFooter = ({ updatedAt, onViewData, className }: GenUiFooterProps) => {
  const { masked } = usePrivacy();
  return (
    <div
      className={cn(
        "mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-(--border) pt-2 text-[11px] text-zinc-500",
        className,
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        <Sparkles className="h-3 w-3" aria-hidden />
        <span>AI-generated</span>
        <span aria-hidden>·</span>
        <Database className="h-3 w-3" aria-hidden />
        <span>Data from this device</span>
        {masked && (
          <>
            <span aria-hidden>·</span>
            <span className="text-(--warning)">masked</span>
          </>
        )}
      </span>
      <span className="inline-flex items-center gap-2">
        <span suppressHydrationWarning>updated {relativeTime(updatedAt)}</span>
        {onViewData && (
          <button
            type="button"
            onClick={onViewData}
            className="rounded-(--radius-sm) px-1.5 py-0.5 font-medium text-(--accent) hover:bg-(--surface-3) focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
          >
            View data
          </button>
        )}
      </span>
    </div>
  );
};

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(ts).toLocaleString();
}
