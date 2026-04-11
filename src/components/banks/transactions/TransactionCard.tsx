"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/stores/useUIStore";
import type { Transaction, Bank, Category } from "@/lib/types";

interface TransactionCardProps {
  transaction: Transaction;
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

export function TransactionCard({
  transaction,
  banks,
  categories,
  onEdit,
  onDelete,
}: Readonly<TransactionCardProps>) {
  const privacyMode = useUIStore((s) => s.privacyMode);

  const bank = banks.find((b) => b.id === transaction.bank);
  const resolvedCategories = transaction.categories
    .map((catId) => categories.find((c) => c.id === catId))
    .filter(Boolean) as Category[];

  const amountColor =
    transaction.type === "income" || transaction.type === "deposit"
      ? "text-success"
      : "text-danger";

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        {/* Top row: bank color indicator + description + amount */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {bank?.primaryColor && (
              <span
                className="inline-block size-3 shrink-0 rounded-full"
                style={{ backgroundColor: bank.primaryColor }}
                aria-label={`Bank: ${bank.name}`}
              />
            )}
            <span className="truncate font-medium">{transaction.description}</span>
          </div>
          <span className={`shrink-0 font-semibold ${amountColor}`}>
            {privacyMode ? "●●●●" : formatAmount(transaction.amount, transaction.type)}
          </span>
        </div>

        {/* Categories as tags */}
        {resolvedCategories.length > 0 && (
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
        )}

        {/* Bottom row: date + actions */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{formatDate(transaction.date)}</span>
          <div className="flex gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onEdit(transaction)}
                aria-label={`Edit ${transaction.description}`}
              >
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                variant="destructive"
                size="xs"
                onClick={() => onDelete(transaction)}
                aria-label={`Delete ${transaction.description}`}
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
