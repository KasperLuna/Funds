"use client";

import { Sparkles, X, AlertTriangle } from "lucide-react";

interface UnsupportedViewProps {
  reason: "no-webgpu" | "no-cross-origin-isolation" | "no-storage" | "unsupported-environment";
  onClose?: () => void;
}

export const UnsupportedView = ({ reason, onClose }: UnsupportedViewProps) => {
  const messages: Record<UnsupportedViewProps["reason"], { title: string; body: string }> = {
    "no-webgpu": {
      title: "WebGPU not available",
      body: "Your browser does not expose WebGPU. The on-device assistant needs a recent Chrome, Edge, or Safari Technology Preview.",
    },
    "no-cross-origin-isolation": {
      title: "Cross-origin isolation required",
      body: "The assistant needs the app to be cross-origin isolated to use shared memory for inference.",
    },
    "no-storage": {
      title: "Not enough free storage",
      body: "The assistant needs at least 1 GB of free storage to cache the model on this device.",
    },
    "unsupported-environment": {
      title: "Assistant unavailable",
      body: "The on-device assistant cannot run in this environment. All other app features still work normally.",
    },
  };
  const m = messages[reason];
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-(--border) bg-(--bg) px-4 py-2.5">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-(--accent)" aria-hidden />
          Assistant
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="rounded-(--radius-sm) p-1.5 text-zinc-500 hover:bg-(--surface-3) hover:text-inherit"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <AlertTriangle className="h-8 w-8 text-(--warning)" aria-hidden />
        <h2 className="text-base font-semibold">{m.title}</h2>
        <p className="max-w-sm text-sm text-zinc-500">{m.body}</p>
      </div>
    </div>
  );
};
