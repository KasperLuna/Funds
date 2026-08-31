"use client";

import { createContext, useContext, useMemo, useReducer, type ReactNode } from "react";
import type { Account, Txn } from "@/lib/accounts/accounts-store";
import type { Category, CategoryBudget } from "@/lib/categories/categories-store";
import { queryKeys, useSyncQuery } from "@/lib/sync/sync-query";
import type { RowRecord } from "@/lib/sync";
import type { LlmSupport } from "@/lib/llm";
import type { LlmEngine } from "@/lib/llm/types";
import type { ChatMessage, ChatStatus } from "@/lib/assistant/types";
import { useAssistantSheetStore } from "./assistant-sheet-store";
import { useChatSend, type ChatSendAction } from "./use-chat-send";

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
  /**
   * Probe device support (OPFS / WebGPU). Idempotent — only the first call
   * does work; subsequent calls are no-ops. Wire to the assistant sheet's
   * `onOpen` so a closed sheet never blocks the dashboard render with a
   * probe.
   */
  probeSupport: () => void;
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

interface ChatDataLayerProps {
  isEnabled: boolean;
}

/**
 * Cavetail: only mounts when the assistant sheet is open. Otherwise we would
 * spin up four Dexie liveQuery subscriptions plus an OPFS / WebGPU probe on
 * every dashboard render, doubling the liveQuery load with the dashboard's
 * own watchers. Splits into Enabled/Disabled sub-components so hooks are only
 * declared on the open path.
 */
function ChatDataLayer({ isEnabled }: ChatDataLayerProps) {
  return isEnabled ? <ChatDataEnabled /> : null;
}

function ChatDataEnabled() {
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

  const value = useMemo<ChatDataValue>(
    () => ({
      accounts: accountsQ.data ?? [],
      txns: txnsQ.data ?? [],
      categories: categoriesQ.data ?? [],
      budgets: budgetsQ.data ?? [],
    }),
    [accountsQ.data, txnsQ.data, categoriesQ.data, budgetsQ.data],
  );

  return <ChatDataContext.Provider value={value} />;
}

type ChatDataValue = {
  accounts: Account[];
  txns: Txn[];
  categories: Category[];
  budgets: CategoryBudget[];
};

const ChatDataContext = createContext<ChatDataValue | null>(null);

function useChatData(): ChatDataValue {
  const v = useContext(ChatDataContext);
  // Before the sheet opens there is no provider — return empty defaults so
  // the rest of the chat machinery (send/reset/setEngine) still functions.
  return v ?? { accounts: [], txns: [], categories: [], budgets: [] };
}

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider = ({ children }: ChatProviderProps) => {
  const [state, dispatch] = useReducer(reducer, initial);
  const { accounts, txns, categories, budgets } = useChatData();

  // cavetail: ChatSendAction is the subset of Action the send path dispatches.
  // The reducer's Action union is a strict superset, so the call site widens
  // with a single cast — no runtime behavior change.
  const { send, reset, probeSupport, setEngine } = useChatSend({
    accounts,
    txns,
    categories,
    budgets,
    dispatch: dispatch as (action: ChatSendAction) => void,
  });

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
      probeSupport,
      setEngine,
    }),
    [state, send, reset, probeSupport, setEngine],
  );

  return (
    <Ctx.Provider value={value}>
      <ChatDataLayerOnOpen />
      {children}
    </Ctx.Provider>
  );
};

/**
 * cavetail: child of both Ctx and AssistantSheetProvider. The probe and the
 * data layer are gated by the sheet's open state — calling them from the
 * provider directly isn't possible because AssistantSheetProvider is a
 * sibling-below of ChatProvider (see dashboard-providers.tsx), so the chat
 * provider can't observe the sheet's open flag itself.
 */
function ChatDataLayerOnOpen() {
  const open = useAssistantSheetStore((s) => s.open);
  return <ChatDataLayer isEnabled={open} />;
}

export const useChat = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useChat must be used within a ChatProvider");
  return v;
};
