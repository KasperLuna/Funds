"use client";

import { useMemo } from "react";
import { Landmark } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrivacyValue } from "@/components/PrivacyValue";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils/format";
import type { Bank } from "@/lib/types";

interface BankSummaryProps {
  readonly banks: readonly Bank[];
}

export function BankSummary({ banks }: BankSummaryProps) {
  const { user } = useAuth();
  const symbol = user?.currency?.symbol ?? "$";

  const sortedBanks = useMemo(
    () => [...banks].sort((a, b) => Math.abs(b.balance) - Math.abs(a.balance)),
    [banks],
  );

  if (banks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <Landmark className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No bank accounts yet. Create one to start tracking your finances.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 lg:grid-cols-3">
      {sortedBanks.map((bank) => {
        const color = bank.primaryColor ?? "hsl(var(--primary))";
        return (
          <Card
            key={bank.id}
            className="min-w-[160px] shrink-0 border-0 ring-1 ring-foreground/5 sm:min-w-0"
            style={{ backgroundColor: `color-mix(in oklch, ${color} 8%, transparent)` }}
          >
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <div
                  className="flex size-7 items-center justify-center rounded-md"
                  style={{ backgroundColor: `color-mix(in oklch, ${color} 20%, transparent)` }}
                >
                  <Landmark className="size-3.5" style={{ color }} />
                </div>
                <CardTitle className="truncate text-sm">{bank.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <PrivacyValue
                value={formatCurrency(bank.balance, symbol)}
                className="text-xl font-bold tracking-tight"
                data-testid={`bank-balance-${bank.id}`}
              />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
