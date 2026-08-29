"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Eraser, AlertTriangle, Download, RefreshCw, Settings } from "lucide-react";
import Link from "next/link";
import { useChat } from "./use-chat";
import { AssistantMessageView } from "./AssistantMessageView";
import { cn } from "@/lib/utils";
import { isIosStorageStale, isIosLikeDevice } from "@/lib/llm/capability";
import { getLlmEngine } from "@/lib/llm";
import { MODEL_LABELS } from "@/lib/llm/types";

/**
 * Chat thread + input + model-status banner. Used both inline on the
 * `/dashboard/assistant` page and inside the bottom-sheet variant on
 * dashboard pages.
 */
export function AssistantPanel({ onClose }: { onClose?: () => void }) {
  const { messages, status, support, send, reset } = useChat();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const unsupported = support && support.ok === false ? support : null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, status]);

  if (unsupported) {
    return <UnsupportedView reason={unsupported.reason} onClose={onClose} />;
  }

  // Show the chat view with loading indicator when auto-loading a model.
  // The input stays visible but disabled until the model is ready.

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-(--border) bg-(--surface-1) px-4 py-3">
        <span className="inline-flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-(--accent)" aria-hidden />
          Assistant
        </span>
        <div className="flex items-center gap-1">
          <ModelChip />
          {messages.length > 0 && (
            <button
              type="button"
              onClick={reset}
              aria-label="Clear chat"
              title="Clear chat"
              className="rounded-(--radius-sm) p-1.5 text-zinc-400 hover:bg-(--surface-3) hover:text-zinc-500"
            >
              <Eraser className="h-4 w-4" aria-hidden />
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close assistant"
              title="Close"
              className="rounded-(--radius-sm) p-1.5 text-zinc-500 hover:bg-(--surface-3) hover:text-inherit"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          )}
        </div>
      </header>

      {support && support.ok && support.engine === "wasm" && (
        <div className="border-b border-(--border) bg-(--warning)/10 px-4 py-2 text-xs text-(--warning)">
          Running in compatibility mode — inference will be slower than the recommended path.
        </div>
      )}

      <StaleBanner />

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <EmptyChat onPick={(text) => setDraft(text)} />
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[85%]",
                  m.role === "user" &&
                    "rounded-(--radius-lg) bg-(--accent) px-3 py-2 text-sm text-(--accent-foreground)",
                )}
              >
                {m.role === "user" ? (
                  <span>{m.content}</span>
                ) : (
                  <AssistantMessageView message={m} />
                )}
              </div>
            </div>
          ))
        )}
        {status === "thinking" && <TypingIndicator />}
        {status === "loading-model" && <ModelLoadingIndicator support={support?.ok ? support : null} />}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!draft.trim() || status !== "idle") return;
          void send(draft);
          setDraft("");
        }}
        className="flex items-center gap-2 border-t border-(--border) bg-(--surface-1) px-3 py-3"
      >
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={status === "idle" ? "Ask about your money…" : "Thinking on-device…"}
          disabled={status !== "idle"}
          aria-label="Ask the assistant"
          className="min-h-11 flex-1 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 text-sm text-inherit placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={!draft.trim() || status !== "idle"}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-(--radius-md) bg-(--accent) text-(--accent-foreground) transition-[filter] hover:brightness-110 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-(--accent) focus-visible:outline-none"
        >
          <Send className="h-4 w-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

function EmptyChat({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = [
    "How much did I spend on Food this month?",
    "Am I over budget on Dining?",
    "Summarize this week",
  ];
  return (
    <div className="flex flex-col items-center gap-4 pt-8 text-center">
      <div className="rounded-full bg-(--surface-2) p-3" aria-hidden>
        <Sparkles className="h-6 w-6 text-(--accent)" />
      </div>
      <div>
        <p className="text-sm font-semibold">Ask about your money</p>
        <p className="mt-1 max-w-xs text-xs text-zinc-500">
          Everything runs on this device. No data leaves the phone.
        </p>
      </div>
      <ul className="flex w-full flex-col gap-2">
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
}

function TypingIndicator() {
  return (
    <div
      role="status"
      aria-label="Assistant is thinking"
      className="inline-flex items-center gap-1 rounded-(--radius-md) bg-(--surface-2) px-3 py-2 text-xs text-zinc-500"
    >
      Thinking on-device
      <span aria-hidden className="ml-1 inline-flex gap-0.5">
        <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-500" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-500 [animation-delay:120ms]" />
        <span className="h-1 w-1 animate-bounce rounded-full bg-zinc-500 [animation-delay:240ms]" />
      </span>
    </div>
  );
}

function ModelLoadingIndicator({ support }: { support: { ok: true; engine: "webgpu" | "wasm"; recommendedModel: string } | null }) {
  return (
    <div
      role="status"
      aria-label="Downloading model"
      className="flex items-center gap-2 rounded-(--radius-md) border border-(--border) bg-(--surface-2) px-3 py-2 text-xs text-zinc-300"
    >
      <Download className="h-3.5 w-3.5 animate-pulse text-(--accent)" aria-hidden />
      <div>
        <p>Downloading model on this device</p>
        <p className="text-[10px] text-zinc-500">
          {support?.ok
            ? `${support.recommendedModel} · ${support.engine}`
            : "probing…"}
        </p>
      </div>
    </div>
  );
}

function UnsupportedView({
  reason,
  onClose,
}: {
  reason: "no-webgpu" | "no-cross-origin-isolation" | "no-storage" | "unsupported-environment";
  onClose?: () => void;
}) {
  const messages: Record<typeof reason, { title: string; body: string }> = {
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
      <header className="flex items-center justify-between border-b border-(--border) bg-(--surface-1) px-4 py-3">
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
}

function ModelChip() {
  const [modelId, setModelId] = useState<string | null>(null);
  useEffect(() => {
    const engine = getLlmEngine();
    setModelId(engine.currentModelId());
  }, []);
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
}

/**
 * Stale-storage banner. Shown when the device is iOS-like AND the last
 * successful load was more than 5 days ago. Tap to redownload.
 */
export function StaleBanner() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!isIosLikeDevice()) return;
    void getLlmEngine()
      .lastLoadedAt()
      .then((ts) => {
        if (isIosStorageStale(ts)) setVisible(true);
      });
  }, []);
  if (!visible) return null;
  return (
    <div className="mx-3 mb-2 flex items-center justify-between gap-2 rounded-(--radius-md) border border-(--warning) bg-(--warning)/10 px-3 py-2 text-xs text-(--warning)">
      <span>Model may need a refresh — re-downloading keeps the assistant available offline.</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          // Trigger a reload by re-invoking getLlmEngine. The AssistantPanel
          // surfaces a fresh load via the status banner on the next send().
          void getLlmEngine().unload();
        }}
        className="inline-flex items-center gap-1 rounded-(--radius-sm) bg-(--warning) px-2 py-1 text-[10px] font-semibold text-zinc-900"
      >
        <RefreshCw className="h-3 w-3" aria-hidden />
        Refresh
      </button>
    </div>
  );
}
