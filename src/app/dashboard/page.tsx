"use client";

import { AssetSummary } from "@/components/dashboard/AssetSummary";
import { BankSummary } from "@/components/dashboard/BankSummary";
import { BudgetsSummary } from "@/components/dashboard/BudgetsSummary";
import { CryptoDashboard } from "@/components/dashboard/CryptoDashboard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { UpcomingPlannedTransactions } from "@/components/dashboard/UpcomingPlannedTransactions";
import { Separator } from "@/components/ui/separator";
import { useBanks } from "@/lib/hooks/useBanks";
import { useCategories } from "@/lib/hooks/useCategories";
import { usePlannedTransactions } from "@/lib/hooks/usePlannedTransactions";
import { useTransactions } from "@/lib/hooks/useTransactions";
import { useTokensContext } from "@/lib/providers/TokensProvider";
import { calculateTotalBalance } from "@/lib/utils/calculations";

export default function DashboardPage() {
  const { data: banks = [] } = useBanks();
  const { data: transactions = [] } = useTransactions();
  const { data: categories = [] } = useCategories();
  const { data: plannedTransactions = [] } = usePlannedTransactions();
  const { portfolioValue } = useTokensContext();

  const bankTotal = calculateTotalBalance(banks);

  return (
    <div className="space-y-8 p-4 md:p-6">
      <DashboardHeader />

      <section aria-label="Asset overview">
        <AssetSummary bankTotal={bankTotal} cryptoTotal={portfolioValue} />
      </section>

      <Separator />

      <section aria-label="Accounts">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Accounts
        </h2>
        <BankSummary banks={banks} />
      </section>

      <Separator />

      <section
        aria-label="Budgets and planned transactions"
        className="grid grid-cols-1 gap-6 lg:grid-cols-2"
      >
        <div>
          <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Budgets
          </h2>
          <BudgetsSummary categories={categories} transactions={transactions} />
        </div>
        <div>
          <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Upcoming
          </h2>
          <UpcomingPlannedTransactions plannedTransactions={plannedTransactions} />
        </div>
      </section>

      <Separator />

      <section aria-label="Crypto portfolio">
        <h2 className="mb-4 text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Portfolio
        </h2>
        <CryptoDashboard />
      </section>
    </div>
  );
}
