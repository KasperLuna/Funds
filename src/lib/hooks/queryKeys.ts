/** Filters for querying transactions */
export interface TransactionFilters {
  bankId?: string;
  categoryId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export const queryKeys = {
  banks: {
    all: ["banks"] as const,
    list: () => [...queryKeys.banks.all, "list"] as const,
    detail: (id: string) => [...queryKeys.banks.all, "detail", id] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    list: (filters?: TransactionFilters) =>
      [...queryKeys.transactions.all, "list", filters] as const,
    detail: (id: string) => [...queryKeys.transactions.all, "detail", id] as const,
  },
  categories: {
    all: ["categories"] as const,
    list: () => [...queryKeys.categories.all, "list"] as const,
  },
  crypto: {
    all: ["crypto"] as const,
    tokens: () => [...queryKeys.crypto.all, "tokens"] as const,
    prices: () => [...queryKeys.crypto.all, "prices"] as const,
  },
  plannedTransactions: {
    all: ["plannedTransactions"] as const,
    list: () => [...queryKeys.plannedTransactions.all, "list"] as const,
    detail: (id: string) => [...queryKeys.plannedTransactions.all, "detail", id] as const,
  },
  pushSubscriptions: {
    all: ["pushSubscriptions"] as const,
    list: () => [...queryKeys.pushSubscriptions.all, "list"] as const,
  },
} as const;
