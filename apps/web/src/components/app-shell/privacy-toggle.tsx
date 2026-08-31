"use client";

import { Eye, EyeOff } from "lucide-react";
import { usePrivacyStore } from "@/lib/privacy/privacy-store";
import { cn } from "@/lib/utils";

interface PrivacyToggleProps {
  className?: string;
  hideLabel?: boolean;
}

export const PrivacyToggle = ({ className, hideLabel = false }: PrivacyToggleProps) => {
  const masked = usePrivacyStore((s) => s.masked);
  const toggle = usePrivacyStore((s) => s.toggle);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={masked ? "Reveal amounts" : "Hide amounts"}
      aria-pressed={!masked}
      className={cn(
        "flex min-h-11 items-center gap-3 rounded-(--radius-md) px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-(--surface-3) hover:text-inherit focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none",
        className,
      )}
    >
      {masked ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
      {!hideLabel && <span>{masked ? "Hidden" : "Visible"}</span>}
    </button>
  );
};
