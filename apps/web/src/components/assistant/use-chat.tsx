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
};

type Action =
  | { type: "append"; message: ChatMessage }
  | { type: "status"; status: ChatStatus }
  | { type: "support"; support: LlmSupport }
  | { type: "load-progress"; progress: { loaded: number; total: number } | null }
  | { type: "stale"; stale: boolean }
  | { type: "reset" };

const initial: State = {
  messages: [],
  status: "idle",
  support: null,
  loadProgress: null,
  staleNotice: false,
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

export function ChatProvider({ children }: { children: ReactNode }) {
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

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const engine = engineRef.current ?? getLlmEngine();
      engineRef.current = engine;
      const status = engine.status();

      // Auto-load the recommended model when nothing is loaded yet.
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
          // Load failed — runChat will handle the error gracefully.
        }
        dispatch({ type: "load-progress", progress: null });
      }

      dispatch({ type: "status", status: "thinking" });
      const deps: ChatEngineDeps = {
        engine,
        accounts,
        categories,
        categoryBudgets: budgets,
        txns,
        assetsById,
        inferUseCase,
      };
      const result = await runChat(
        { text, now: Date.now(), userId: userId ?? "local" },
        deps,
      );
      dispatch({ type: "append", message: result.user });
      dispatch({ type: "append", message: result.assistant });
      dispatch({ type: "status", status: "idle" });
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
      send,
      reset,
      setEngine,
    }),
    [state, send, reset, setEngine],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useChat() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChat must be used within a ChatProvider");
  return v;
}
