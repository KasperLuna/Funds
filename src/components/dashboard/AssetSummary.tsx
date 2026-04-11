"use client";

import { Landmark, Bitcoin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PrivacyValue } from "@/components/PrivacyValue";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency } from "@/lib/utils/format";

interface AssetSummaryProps {
  readonly bankTotal: number;
  readonly cryptoTotal: number;
}

export function AssetSummary({ bankTotal, cryptoTotal }: AssetSummaryProps) {
  const { user } = useAuth();
  const totalAssets = bankTotal + cryptoTotal;
  const symbol = user?.currency?.symbol ?? "$";

  return (
    <Card className="border-0 bg-linear-to-br from-primary/10 via-card to-card ring-1 ring-primary/20">
      <CardContent className="py-6">
        <p className="text-sm font-medium text-muted-foreground">Total Assets</p>
        <PrivacyValue
          value={formatCurrency(totalAssets, symbol)}
          className="mt-1 block text-4xl font-bold tracking-tight"
          data-testid="total-assets"
        />

        <div className="mt-6 flex flex-wrap gap-6">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-chart-1/15">
              <Landmark className="size-4 text-chart-1" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Bank Accounts</p>
              <PrivacyValue
                value={formatCurrency(bankTotal, symbol)}
                className="text-sm font-semibold"
                data-testid="bank-total"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-chart-5/15">
              <Bitcoin className="size-4 text-chart-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Crypto Portfolio</p>
              <PrivacyValue
                value={formatCurrency(cryptoTotal, symbol)}
                className="text-sm font-semibold"
                data-testid="crypto-total"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
