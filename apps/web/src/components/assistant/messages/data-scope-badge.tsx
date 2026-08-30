"use client";

import { cn } from "@/lib/utils";
import type { ScopeFlags } from "@/lib/assistant/types";

interface DataScopeBadgeProps {
  scope?: ScopeFlags;
  className?: string;
}

/**
 * Tiny scope pill that surfaces when a widget intentionally includes archived
 * accounts or `excludeFromAnalytics` categories. Kept low-contrast so it does
 * not compete with the chart; collapses to nothing when nothing extra was
 * pulled in.
 */
export const DataScopeBadge = ({ scope, className }: DataScopeBadgeProps) => {
  if (!scope) return null;
  const parts: string[] = [];
  if (scope.includesArchived) parts.push("archived");
  if (scope.includesExcluded) parts.push("excluded");
  if (parts.length === 0) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-(--border) bg-(--surface-2) px-1.5 py-0.5 text-[10px] text-zinc-500",
        className,
      )}
      title={`Includes ${parts.join(" and ")} items`}
    >
      includes {parts.join(" + ")}
    </span>
  );
};
