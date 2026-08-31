"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Send, X, Eraser } from "lucide-react";
import { useChat } from "./use-chat";
import { AssistantMessageView } from "./assistant-message-view";
import { cn } from "@/lib/utils";
import { EmptyChat } from "./empty-chat";
import { TypingIndicator } from "./typing-indicator";
import { ThinkingBlock } from "./thinking-block";
import { ModelLoadingIndicator } from "./model-loading-indicator";
import { UnsupportedView } from "./unsupported-view";
import { ModelChip } from "./model-chip";
import { StaleBanner } from "./stale-banner";
import type { ChatMessage } from "@/lib/assistant/types";

interface AssistantPanelProps {
  onClose?: () => void;
}

interface ChatBubbleProps {
  message: ChatMessage;
  onPickSuggestion: (text: string) => void;
}

/**
 * Chat thread + input + model-status banner. Used both inline on the
 * `/dashboard/assistant` page and inside the bottom-sheet variant on
 * dashboard pages.
 */
export const AssistantPanel = ({ onClose }: AssistantPanelProps) => {
  const { messages, status, support, streamingText, send, reset } = useChat();
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const unsupported = support && support.ok === false ? support : null;

  // cavetail: imperative scroll into a viewport coordinate outside React's render tree
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
      <header className="flex items-center justify-between border-b border-(--border) bg-(--bg) px-4 py-2.5">
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

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <EmptyChat onPick={(text) => setDraft(text)} />
        ) : (
          messages.map((m) => (
            <ChatBubble
              key={m.id}
              message={m}
              onPickSuggestion={(text) => {
                setDraft(text);
                if (status === "idle") {
                  void send(text);
                  setDraft("");
                }
              }}
            />
          ))
        )}
        {status === "thinking" && streamingText && <ThinkingBlock text={streamingText} />}
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
        className="flex items-center gap-2 border-t border-(--border) bg-(--bg) px-3 py-2.5"
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
};

const ChatBubble = ({ message, onPickSuggestion }: ChatBubbleProps) => {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%]",
          isUser &&
            "rounded-(--radius-lg) bg-(--accent) px-3 py-2 text-sm text-(--accent-foreground)",
        )}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <AssistantMessageView message={message} onPickSuggestion={onPickSuggestion} />
        )}
      </div>
    </div>
  );
};
