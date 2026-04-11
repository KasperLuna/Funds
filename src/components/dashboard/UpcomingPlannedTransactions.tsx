"use client";

import { useMemo } from "react";
import { CalendarClock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PrivacyValue } from "@/components/PrivacyValue";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils/format";
import { calculateNextOccurrence } from "@/lib/utils/recurrence";
import type { PlannedTransaction, TransactionType } from "@/lib/types";

interface UpcomingPlannedTransactionsProps {
  readonly plannedTransactions: readonly PlannedTransaction[];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TypeBadge({ type }: Readonly<{ type: TransactionType }>) {
  const isPositive = type === "income" || type === "deposit";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
        isPositive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
      }`}
    >
      {type}
    </span>
  );
}

export function UpcomingPlannedTransactions({
  plannedTransactions,
}: UpcomingPlannedTransactionsProps) {
  const { user } = useAuth();
  const symbol = user?.currency?.symbol ?? "$";

  const upcoming = useMemo(() => {
    return plannedTransactions
      .filter((pt) => pt.active)
      .map((pt) => {
        const baseDate = pt.previousDate ? new Date(pt.previousDate) : new Date(pt.invokeDate);
        const nextOccurrence = calculateNextOccurrence(pt.recurrence, baseDate);
        return { ...pt, nextOccurrence };
      })
      .sort((a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime());
  }, [plannedTransactions]);

  if (upcoming.length === 0) {
    return (
      <Card className="h-full">
        <CardContent className="flex h-full flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <CalendarClock className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No planned transactions. Create one to see upcoming occurrences.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardContent className="pt-4">
        <div className="space-y-3">
          {upcoming.map((pt) => {
            const isPositive = pt.type === "income" || pt.type === "deposit";
            const sign = isPositive ? "+" : "-";
            const colorClass = isPositive ? "text-success" : "text-danger";
            return (
              <div
                key={pt.id ?? pt.description}
                className="flex items-center justify-between rounded-lg border border-foreground/5 bg-muted/30 p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{pt.description}</p>
                  <div className="flex items-center gap-2">
                    <TypeBadge type={pt.type} />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(pt.nextOccurrence)}
                    </span>
                  </div>
                </div>
                <PrivacyValue
                  value={`${sign}${formatCurrency(pt.amount, symbol)}`}
                  className={`text-sm font-semibold ${colorClass}`}
                />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
