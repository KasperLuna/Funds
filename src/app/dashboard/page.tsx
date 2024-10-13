"use client";
import { BankTrends } from "@/components/dashboard/banks/BankTrends";
import { MonthlyBreakdown } from "@/components/dashboard/banks/MonthlyBreakdown";
import { BankSummary } from "@/components/dashboard/BankSummary";
import { PrivacyToggle } from "@/components/PrivacyToggle";
import dynamic from "next/dynamic";

function Page() {
  const title = "Funds - Dashboard";
  return (
    <div className="text-slate-200">
      <title>{title}</title>
      <div className="flex flex-col gap-4">
        <div className="flex flex-row gap-2">
          <PrivacyToggle />
          <h1 className="md:text-3xl text-2xl font-semibold">Dashboard</h1>
        </div>

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
