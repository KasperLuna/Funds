"use client";

import { useMemo } from "react";
import { PieChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PrivacyMask } from "@/components/PrivacyValue";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils/format";
import {
  calculateCategorySpending,
  calculateBudgetRemaining,
  getMonthBoundaries,
} from "@/lib/utils/calculations";
import type { Category, Transaction } from "@/lib/types";

interface BudgetsSummaryProps {
  categories: Category[];
  transactions: Transaction[];
}

function getProgressClasses(percentage: number): string {
  if (percentage < 50) return "bg-green-600 dark:bg-green-500";
  if (percentage <= 80) return "bg-yellow-600 dark:bg-yellow-500";
  return "bg-red-600 dark:bg-red-500";
}

function getStatusDot(percentage: number): string {
  if (percentage < 50) return "bg-green-500";
  if (percentage <= 80) return "bg-yellow-500";
  return "bg-red-500";
}

export function BudgetsSummary({ categories, transactions }: BudgetsSummaryProps) {
  const { user } = useAuth();
  const symbol = user?.currency?.symbol ?? "$";

  const monthRange = useMemo(() => getMonthBoundaries(new Date()), []);

  const budgetedCategories = useMemo(() => {
    return categories
      .filter((cat) => cat.monthly_budget != null && cat.monthly_budget > 0)
      .map((cat) => {
        const spending = calculateCategorySpending(transactions, cat.id, monthRange);
        const budget = cat.monthly_budget!;
        const remaining = calculateBudgetRemaining(budget, spending);
        const percentage = budget > 0 ? Math.round((spending / budget) * 100) : 0;

        return { category: cat, spending, budget, remaining, percentage };
      });
  }, [categories, transactions, monthRange]);

  if (budgetedCategories.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <PieChart className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No budgets set. Add a monthly budget to a category to track spending.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="pt-4">
        <div className="space-y-5">
          {budgetedCategories.map(({ category, spending, budget, percentage }) => {
            const overBudget = percentage > 100;
            const clampedPct = Math.min(percentage, 100);
            return (
              <div
                key={category.id}
                className={`space-y-2 rounded-lg p-3 ${overBudget ? "bg-red-500/8" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block size-2 rounded-full ${getStatusDot(percentage)}`}
                    />
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <PrivacyMask
                    value={`${formatCurrency(spending, symbol)} / ${formatCurrency(budget, symbol)}`}
                    mask="●●●● / ●●●●"
                    className="text-xs text-muted-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={clampedPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${category.name} budget usage`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all ${getProgressClasses(percentage)}`}
                      style={{ width: `${clampedPct}%` }}
                    />
                  </div>
                  <PrivacyMask
                    value={`${percentage}%`}
                    mask="●●"
                    className="w-10 text-right text-xs font-medium text-muted-foreground"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
