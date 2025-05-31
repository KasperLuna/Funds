import { BankMonthlies } from "@/components/dashboard/BankMonthlies";
import { AssetSummary } from "@/components/dashboard/AssetSummary";
import UpcomingPlannedTransactions from "@/components/dashboard/UpcomingPlannedTransactions";
import { PlannedTransactionPrefillHandler } from "@/components/dashboard/PlannedTransactionPrefillHandler";

export default function Page() {
  const title = "Funds - Dashboard";
  return (
    <div className="text-slate-200">
      <title>{title}</title>
      <div className="flex flex-col gap-4 h-fit">
        <UpcomingPlannedTransactions />
        <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 gap-4">
          <AssetSummary />
          <BankMonthlies />
        </div>
      </div>
      <PlannedTransactionPrefillHandler />
    </div>
  );
}
