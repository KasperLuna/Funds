"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSync } from "@/lib/sync/sync-context";
import { getLlmEngine, getLlmSupport, setLlmEngineForTest, type LlmSupport } from "@/lib/llm";
import type { LlmEngine } from "@/lib/llm/types";
import { runChat, inferUseCase, type ChatEngineDeps } from "@/lib/assistant/chat-engine";
import type { ChatStatus, ChatMessage } from "@/lib/assistant/types";
import { useAssets } from "@/lib/assets";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";

export type ChatSendAction =
  | { type: "status"; status: ChatStatus }
  | { type: "load-progress"; progress: { loaded: number; total: number } | null }
  | { type: "support"; support: LlmSupport }
  | { type: "stream-text"; text: string | null }
  | { type: "append"; message: ChatMessage }
  | { type: "reset" };

interface ChatSendArgs {
  accounts: Account[];
  txns: Txn[];
  categories: Category[];
  budgets: CategoryBudget[];
  dispatch: (action: ChatSendAction) => void;
}

export interface ChatSendApi {
  send: (text: string) => Promise<void>;
  probeSupport: () => void;
  setEngine: (engine: LlmEngine | null) => void;
  reset: () => void;
}

/**
 * cavetail: only depends on a dispatch callback so the same Send path can be
 * driven by a reducer (provider), a test harness, or a future refactor that
 * pulls state into Jotai/Zustand without rewriting the engine call.
 */
export function useChatSend({ accounts, txns, categories, budgets, dispatch }: ChatSendArgs): ChatSendApi {
  const { userId } = useSync();
  const { assets } = useAssets();
  const engineRef = useRef<LlmEngine | null>(null);
  const streamingBufRef = useRef("");

  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, { code: a.code, decimals: a.decimals }])),
    [assets],
  );

  // Probe device support when the sheet first opens (not on every mount) so
  // a closed sheet never blocks the dashboard render with an OPFS / WebGPU
  // probe. The ref guards against repeated probes within this provider
  // instance; re-mount resets it naturally.
  const supportProbedRef = useRef(false);
  const probeSupport = useCallback(() => {
    if (supportProbedRef.current) return;
    supportProbedRef.current = true;
    void (async () => {
      const support = await getLlmSupport();
      dispatch({ type: "support", support });
    })();
  }, [dispatch]);

  // Wipe chat on sign-out so a different user never sees the previous thread.
  const reset = useCallback(() => dispatch({ type: "reset" }), [dispatch]);

  const setEngine = useCallback((engine: LlmEngine | null) => {
    setLlmEngineForTest(engine);
    engineRef.current = engine;
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const engine = engineRef.current ?? getLlmEngine();
      engineRef.current = engine;
      const status = engine.status();

      // Auto-load the recommended model when nothing is loaded yet. A load
      // failure is NOT swallowed silently: engine.loadError flows into
      // complete()'s throw, and runChat attaches it to the fallback notice.
      if (status === "not-loaded" || status === "error") {
        dispatch({ type: "status", status: "loading-model" });
        dispatch({ type: "load-progress", progress: { loaded: 0, total: 1 } });
        try {
          const support = await getLlmSupport();
          const modelId = support.ok ? support.recommendedModel : "SmolLM2-360M-Instruct-q4f16_1-MLC";
          await engine.load(modelId, (p) => {
            dispatch({ type: "load-progress", progress: p });
          });
        } catch {
          // runChat's fallback path renders the reason via the engine's
          // loadError; nothing else to do here.
        }
        dispatch({ type: "load-progress", progress: null });
      }

      dispatch({ type: "status", status: "thinking" });
      // Append user message immediately so the bubble appears while the model runs.
      dispatch({
        type: "append",
        message: {
          id: crypto.randomUUID().replace(/-/g, "").slice(0, 26),
          role: "user",
          content: text,
          ts: Date.now(),
        },
      });
      streamingBufRef.current = "";
      const deps: ChatEngineDeps = {
        engine,
        accounts,
        categories,
        categoryBudgets: budgets,
        txns,
        assetsById,
        inferUseCase,
        onToken: (token) => {
          streamingBufRef.current += token;
          dispatch({ type: "stream-text", text: streamingBufRef.current });
        },
      };
      try {
        const result = await runChat(
          { text, now: Date.now(), userId: userId ?? "local" },
          deps,
        );
        dispatch({ type: "stream-text", text: null });
        dispatch({ type: "append", message: result.assistant });
        dispatch({ type: "status", status: "idle" });
      } catch (err) {
      // Safety net: if runChat itself throws (e.g. an uncaught iOS crash
      // escapes the engine's own error handling), surface a user-friendly
      // message and reset the UI to idle instead of leaving it stuck in
      // "thinking" forever.
      dispatch({ type: "stream-text", text: null });
      const reason =
        err instanceof DOMException && err.name === "AbortError"
          ? "Request cancelled."
          : err instanceof Error
            ? `Model crashed: ${err.message}`
            : "Model crashed unexpectedly. Try again.";
      dispatch({
        type: "append",
        message: {
          id: crypto.randomUUID().replace(/-/g, "").slice(0, 26),
          role: "assistant",
          type: "error",
          reason,
          ts: Date.now(),
          usedCase: "fallback_text",
        },
      });
      dispatch({ type: "status", status: "idle" });
    }
  },
    [accounts, categories, budgets, txns, assetsById, userId, dispatch],
  );

  return { send, probeSupport, setEngine, reset };
}
