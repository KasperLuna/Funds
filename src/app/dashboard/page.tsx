import { BankMonthlies } from "@/components/dashboard/BankMonthlies";
import { AssetSummary } from "@/components/dashboard/AssetSummary";
import UpcomingPlannedTransactions from "@/components/dashboard/UpcomingPlannedTransactions";
import { PlannedTransactionPrefillHandler } from "@/components/dashboard/PlannedTransactionPrefillHandler";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BudgetsSummary } from "@/components/dashboard/BudgetsSummary";
import { Onboarding } from "@/components/dashboard/Onboarding";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  const title = "Funds - Dashboard";
  return (
    <div className="text-slate-200 min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 mb-20 md:mb-0">
      <title>{title}</title>
      <div className="flex flex-col gap-3 h-fit p-2">
        <UpcomingPlannedTransactions />
        <Onboarding />
        <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 gap-3">
          <AssetSummary />
          {/* Right-hand section: Budgets/Bank Monthly tabs */}
          <div className="relative w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl pointer-events-none" />
            <Tabs defaultValue="budgets" className="relative z-10 w-full">
              <TabsList className="mb-2 w-fit bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-1">
                <TabsTrigger
                  value="budgets"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-slate-900 transition-all duration-300"
                >
                  Budgets
                </TabsTrigger>
                <TabsTrigger
                  value="bankmonthly"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500/20 data-[state=active]:to-blue-500/20 data-[state=active]:text-slate-900 transition-all duration-300"
                >
                  Bank Monthly
                </TabsTrigger>
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
      <div className="flex md:hidden fixed bottom-[95px] z-50 right-5">
        <Link href={"/dashboard/banks?create=Transaction"}>
          <Button className="px-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-full w-14 h-14 shadow-lg hover:shadow-emerald-500/30 hover:scale-110 transition-all duration-300">
            <Plus className="text-white" />
          </Button>
        </Link>
      </div>
      <PlannedTransactionPrefillHandler />
    </div>
  );
}
