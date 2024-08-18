import { BankSummary } from "@/components/dashboard/BankSummary";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Funds - Dashboard",
  description: "Funds - A personal finance tracker app.",
};

export default function Page() {
  return (
    <div className="text-slate-200">
      <div>
        <h1 className="md:text-3xl text-2xl font-semibold">Dashboard</h1>
        <BankSummary />
      </div>
    </div>
  );
}
