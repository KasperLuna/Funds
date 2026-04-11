"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/useUIStore";
import type { Transaction, Bank, Category } from "@/lib/types";

interface TransactionsTableProps {
  transactions: Transaction[];
  banks: Bank[];
  categories: Category[];
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (transaction: Transaction) => void;
}

function formatAmount(amount: number, type: string): string {
  const sign = type === "income" || type === "deposit" ? "+" : "-";
  return `${sign}$${amount.toFixed(2)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function TransactionsTable({
  transactions,
  banks,
  categories,
  onEdit,
  onDelete,
}: Readonly<TransactionsTableProps>) {
  const privacyMode = useUIStore((s) => s.privacyMode);

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50 text-left text-muted-foreground">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Description</th>
            <th className="px-4 py-2 font-medium">Type</th>
            <th className="px-4 py-2 font-medium">Amount</th>
            <th className="px-4 py-2 font-medium">Categories</th>
            <th className="px-4 py-2 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {transactions.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                No transactions found.
              </td>
            </tr>
          )}
          {transactions.map((tx) => {
            const bank = banks.find((b) => b.id === tx.bank);
            const resolvedCategories = tx.categories
              .map((catId) => categories.find((c) => c.id === catId))
              .filter(Boolean) as Category[];

            const amountColor =
              tx.type === "income" || tx.type === "deposit" ? "text-success" : "text-danger";

            return (
              <tr key={tx.id} className="border-b last:border-b-0 hover:bg-muted/30">
                <td className="px-4 py-2 whitespace-nowrap">{formatDate(tx.date)}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {bank?.primaryColor && (
                      <span
                        className="inline-block size-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: bank.primaryColor }}
                        aria-label={`Bank: ${bank.name}`}
                      />
                    )}
                    <span className="truncate">{tx.description}</span>
                  </div>
                </td>
                <td className="px-4 py-2 capitalize">{capitalizeFirst(tx.type)}</td>
                <td className={`px-4 py-2 font-medium ${amountColor}`}>
                  {privacyMode ? "●●●●" : formatAmount(tx.amount, tx.type)}
                </td>
                <td className="px-4 py-2">
                  <div className="flex flex-wrap gap-1">
                    {resolvedCategories.map((cat) => (
                      <span
                        key={cat.id}
                        className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-1 justify-end">
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onEdit(tx)}
                        aria-label={`Edit ${tx.description}`}
                      >
                        Edit
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="destructive"
                        size="xs"
                        onClick={() => onDelete(tx)}
                        aria-label={`Delete ${tx.description}`}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
