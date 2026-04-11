"use client";

import { useMemo } from "react";
import { Coins } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PrivacyValue, PrivacyMask } from "@/components/PrivacyValue";
import { useTokensContext } from "@/lib/providers/TokensProvider";
import { useUIStore } from "@/lib/stores/useUIStore";
import { useAuth } from "@/lib/hooks/useAuth";
import { formatCurrency, formatNumber } from "@/lib/utils/format";
import { calculatePercentageChange } from "@/lib/utils/crypto";

const PRIVACY_MASK = "●●●●";

function TokenAvatar({ name }: Readonly<{ name: string }>) {
  return (
    <div className="flex size-9 items-center justify-center rounded-full bg-chart-5/15 text-sm font-bold text-chart-5">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function ChangeBadge({ value, privacyMode }: Readonly<{ value: number; privacyMode: boolean }>) {
  if (privacyMode) {
    return (
      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
        {PRIVACY_MASK}
      </span>
    );
  }

  const isPositive = value >= 0;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isPositive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
      }`}
    >
      {isPositive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

export function CryptoDashboard() {
  const { tokens, prices, portfolioValue, isLoadingTokens, isLoadingPrices } = useTokensContext();
  const privacyMode = useUIStore((s) => s.privacyMode);
  const { user } = useAuth();
  const symbol = user?.currency?.symbol ?? "$";

  const isLoading = isLoadingTokens || isLoadingPrices;

  const tokenRows = useMemo(
    () =>
      tokens.map((token) => {
        const currentPrice = prices[token.coingecko_id] ?? 0;
        const currentValue = token.total * currentPrice;
        const percentageChange = calculatePercentageChange(currentPrice, token.costAvg);

        return { token, currentPrice, currentValue, percentageChange };
      }),
    [tokens, prices],
  );

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <output className="text-sm text-muted-foreground">Loading crypto data…</output>
        </CardContent>
      </Card>
    );
  }

  if (tokens.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted">
            <Coins className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No tokens added. Add a cryptocurrency token to start tracking your portfolio.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-5">
          <p className="text-xs text-muted-foreground">Total Portfolio Value</p>
          <PrivacyValue
            value={formatCurrency(portfolioValue, symbol)}
            className="mt-0.5 block text-2xl font-bold tracking-tight"
          />
        </div>

        <div className="space-y-2">
          {tokenRows.map(({ token, currentPrice, currentValue, percentageChange }) => (
            <div
              key={token.id}
              className="flex items-center gap-3 rounded-lg border border-foreground/5 bg-muted/30 p-3"
            >
              <TokenAvatar name={token.name} />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{token.name}</p>
                <p className="text-xs text-muted-foreground uppercase">{token.symbol}</p>
              </div>

              <div className="text-right">
                <PrivacyValue
                  value={formatCurrency(currentValue, symbol)}
                  className="text-sm font-semibold"
                />
                <div className="mt-0.5 flex items-center justify-end gap-1.5">
                  <PrivacyMask
                    value={`${formatNumber(token.total)} × ${formatCurrency(currentPrice, symbol)}`}
                    className="text-[10px] text-muted-foreground"
                  />
                  <ChangeBadge value={percentageChange} privacyMode={privacyMode} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
