"use client";
import { BankTrends } from "@/components/dashboard/banks/trends";
import { MonthlyBreakdown } from "@/components/dashboard/banks/MonthlyBreakdown";
import { BankSummary } from "@/components/dashboard/banks/BankSummary";
import dynamic from "next/dynamic";
import UpcomingPlannedTransactions from "@/components/dashboard/UpcomingPlannedTransactions";

function Page() {
  const title = "Funds - Dashboard";
  return (
    <div className="text-slate-200">
      <title>{title}</title>
      <div className="flex flex-col gap-4">
        <UpcomingPlannedTransactions />
        <div className="flex flex-col gap-4 lg:flex-row">
          <BankTrends />
          <div className="flex w-full flex-col gap-4">
            <BankSummary />
            <MonthlyBreakdown />
          </div>
        </div>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(Page), {
  ssr: false,
});
