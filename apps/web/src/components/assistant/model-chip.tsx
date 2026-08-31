"use client";

import { useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import { getLlmEngine } from "@/lib/llm";
import { MODEL_LABELS } from "@/lib/llm/types";

export const ModelChip = () => {
  const [modelId] = useState<string | null>(() => getLlmEngine().currentModelId());
  if (!modelId) return null;
  const label = MODEL_LABELS[modelId as keyof typeof MODEL_LABELS] ?? modelId;
  return (
    <Link
      href="/dashboard/settings"
      title="Change model in Settings"
      className="inline-flex items-center gap-1 rounded-full bg-(--surface-2) px-2 py-0.5 text-[10px] font-medium text-zinc-400 transition-colors hover:bg-(--surface-3) hover:text-zinc-300"
    >
      <Settings className="h-2.5 w-2.5" aria-hidden />
      {label}
    </Link>
  );
};
