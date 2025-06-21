import { BankMonthlies } from "@/components/dashboard/BankMonthlies";
import { AssetSummary } from "@/components/dashboard/AssetSummary";
import UpcomingPlannedTransactions from "@/components/dashboard/UpcomingPlannedTransactions";
import { PlannedTransactionPrefillHandler } from "@/components/dashboard/PlannedTransactionPrefillHandler";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BudgetsSummary } from "@/components/dashboard/BudgetsSummary";

export default function Page() {
  const title = "Funds - Dashboard";
  return (
    <div className="text-slate-200">
      <title>{title}</title>
      <div className="flex flex-col gap-4 h-fit">
        <UpcomingPlannedTransactions />
        <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 gap-4">
          <AssetSummary />
          {/* Right-hand section: Budgets/Bank Monthly tabs */}
          <div className="w-full">
            <Tabs defaultValue="budgets" className="w-full">
              <TabsList className="mb-2 w-fit bg-transparent fill-slate-200">
                <TabsTrigger value="budgets">Budgets</TabsTrigger>
                <TabsTrigger value="bankmonthly">Bank Monthly</TabsTrigger>
              </TabsList>
              <TabsContent value="budgets">
                <BudgetsSummary />
              </TabsContent>
              <TabsContent value="bankmonthly">
                <BankMonthlies />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <PlannedTransactionPrefillHandler />
    </div>
  );
}
