"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from "react";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";
import { useSync } from "@/lib/sync/sync-context";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import type { RowRecord } from "@/lib/sync";
import { getLlmEngine, getLlmSupport, setLlmEngineForTest, type LlmSupport } from "@/lib/llm";
import type { LlmEngine } from "@/lib/llm/types";
import { runChat, inferUseCase, type ChatEngineDeps } from "@/lib/assistant/chat-engine";
import type { ChatMessage, ChatStatus } from "@/lib/assistant/types";
import { useAssets } from "@/lib/assets";

type State = {
  messages: ChatMessage[];
  status: ChatStatus;
  support: LlmSupport | null;
  loadProgress: { loaded: number; total: number } | null;
  staleNotice: boolean;
  streamingText: string | null;
};

type Action =
  | { type: "append"; message: ChatMessage }
  | { type: "status"; status: ChatStatus }
  | { type: "support"; support: LlmSupport }
  | { type: "load-progress"; progress: { loaded: number; total: number } | null }
  | { type: "stale"; stale: boolean }
  | { type: "stream-text"; text: string | null }
  | { type: "reset" };

const initial: State = {
  messages: [],
  status: "idle",
  support: null,
  loadProgress: null,
  staleNotice: false,
  streamingText: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "append":
      return { ...state, messages: [...state.messages, action.message] };
    case "status":
      return { ...state, status: action.status };
    case "support":
      return { ...state, support: action.support };
    case "load-progress":
      return { ...state, loadProgress: action.progress };
    case "stale":
      return { ...state, staleNotice: action.stale };
    case "stream-text":
      return { ...state, streamingText: action.text };
    case "reset":
      return initial;
  }
}

type ChatContextValue = {
  messages: ChatMessage[];
  status: ChatStatus;
  support: LlmSupport | null;
  loadProgress: { loaded: number; total: number } | null;
  staleNotice: boolean;
  streamingText: string | null;
  send: (text: string) => Promise<void>;
  reset: () => void;
  /** Test seam: inject a mock engine. */
  setEngine: (engine: LlmEngine | null) => void;
};

const Ctx = createContext<ChatContextValue | null>(null);

function toAccount(row: RowRecord): Account {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind) as Account["kind"],
    assetId: String(row.asset_id),
    openingBalanceMinor: BigInt(row.opening_balance_minor as string | bigint),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    archived: Boolean(row.archived),
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
  };
}

function toTxn(row: RowRecord): Txn {
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    assetId: String(row.asset_id ?? ""),
    amountMinor: BigInt(row.amount_minor as string | bigint),
    type: String(row.type) as Txn["type"],
    description: String(row.description ?? ""),
    categoryIds: Array.isArray(row.category_ids) ? (row.category_ids as string[]) : [],
    date: Number(row.date),
    transferId: row.transfer_id != null ? String(row.transfer_id) : null,
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
  };
}

function toCategory(row: RowRecord): Category {
  return {
    id: String(row.id),
    name: String(row.name),
    color: typeof row.color === "string" ? row.color : "#71717a",
    hideable: Boolean(row.hideable),
    excludeFromAnalytics: Boolean(row.exclude_from_analytics),
    monthlyBudgetMinor: row.monthly_budget_minor != null
      ? BigInt(row.monthly_budget_minor as string | bigint)
      : null,
    assetId: row.asset_id != null ? String(row.asset_id) : null,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at ? Number(row.deleted_at) : null,
  };
}

function toBudget(row: RowRecord): CategoryBudget {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    assetId: String(row.asset_id),
    monthStart: Number(row.month_start),
    amountMinor: BigInt(row.amount_minor as number | string),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    deletedAt: row.deleted_at != null ? Number(row.deleted_at) : null,
  };
}

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initial);
  const { userId } = useSync();
  const { assets } = useAssets();
  const engineRef = useRef<LlmEngine | null>(null);

  // Raw rows — handlers do their own mapping; the engine doesn't see money.
  const accountsQ = useSyncQuery({
    key: queryKeys.accounts,
    sql: "SELECT * FROM accounts WHERE deleted_at IS NULL",
    select: toAccount,
  });
  const txnsQ = useSyncQuery({
    key: queryKeys.transactions,
    scope: "all",
    sql: "SELECT * FROM transactions",
    select: toTxn,
  });
  const categoriesQ = useSyncQuery({
    key: queryKeys.categories,
    scope: "all",
    sql: "SELECT * FROM categories",
    select: toCategory,
  });
  const budgetsQ = useSyncQuery({
    key: queryKeys.categoryBudgets,
    sql: "SELECT * FROM category_budgets WHERE deleted_at IS NULL",
    select: toBudget,
  });

  const accounts = accountsQ.data ?? [];
  const txns = txnsQ.data ?? [];
  const categories = categoriesQ.data ?? [];
  const budgets = budgetsQ.data ?? [];

  const assetsById = useMemo(
    () => new Map(assets.map((a) => [a.id, { code: a.code, decimals: a.decimals }])),
    [assets],
  );

  // Probe device support on mount and when online status changes.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const support = await getLlmSupport();
      if (cancelled) return;
      dispatch({ type: "support", support });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Wipe chat on sign-out so a different user never sees the previous thread.
  useEffect(() => {
    if (userId == null) dispatch({ type: "reset" });
  }, [userId]);

  const setEngine = useCallback((engine: LlmEngine | null) => {
    setLlmEngineForTest(engine);
    engineRef.current = engine;
  }, []);

  const streamingBufRef = useRef("");

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
    [accounts, categories, budgets, txns, assetsById, userId],
  );

  const reset = useCallback(() => dispatch({ type: "reset" }), []);

  const value: ChatContextValue = useMemo(
    () => ({
      messages: state.messages,
      status: state.status,
      support: state.support,
      loadProgress: state.loadProgress,
      staleNotice: state.staleNotice,
      streamingText: state.streamingText,
      send,
      reset,
      setEngine,
    }),
    [state, send, reset, setEngine],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useChat = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChat must be used within a ChatProvider");
  return v;
};
