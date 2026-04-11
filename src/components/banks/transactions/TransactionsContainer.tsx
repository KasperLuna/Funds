"use client";

import { useResponsive } from "@/lib/hooks/useResponsive";
import { TransactionFilter } from "./TransactionFilter";
import { TransactionCard } from "./TransactionCard";
import { TransactionsTable } from "./TransactionsTable";
import type { Bank, Category, Transaction, TransactionFilters } from "@/lib/types";

interface TransactionsContainerProps {
  transactions: Transaction[];
  banks: Bank[];
  categories: Category[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
  onFiltersChange?: (filters: TransactionFilters) => void;
}

export function TransactionsContainer({
  transactions,
  banks,
  categories,
  onEdit,
  onDelete,
  onFiltersChange,
}: Readonly<TransactionsContainerProps>) {
  const { isMobile } = useResponsive();
  const handleFiltersChange = (newFilters: TransactionFilters) => {
    onFiltersChange?.(newFilters);
  };

  return (
    <div className="flex flex-col gap-4">
      <TransactionFilter banks={banks} categories={categories} onChange={handleFiltersChange} />

      {isMobile ? (
        <div className="flex flex-col gap-3">
          {transactions.length === 0 && (
            <output className="block py-8 text-center text-sm text-muted-foreground">
              No transactions found.
            </output>
          )}
          {transactions.map((tx) => (
            <TransactionCard
              key={tx.id}
              transaction={tx}
              banks={banks}
              categories={categories}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <TransactionsTable
          transactions={transactions}
          banks={banks}
          categories={categories}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
