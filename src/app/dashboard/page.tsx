"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { AssetSummary } from "@/components/dashboard/AssetSummary";
import { UpcomingPlannedTransactions } from "@/components/dashboard/UpcomingPlannedTransactions";
import { PlannedTransactionPrefillHandler } from "@/components/dashboard/PlannedTransactionPrefillHandler";
import { VoiceDraftPrefillHandler } from "@/components/dashboard/VoiceDraftPrefillHandler";
import { UpcomingVoiceDrafts } from "@/components/dashboard/UpcomingVoiceDrafts";
import { BudgetsSummary } from "@/components/dashboard/BudgetsSummary";
import { Onboarding } from "@/components/dashboard/Onboarding";
import { CategoryBreakdown } from "@/components/dashboard/banks/CategoryBreakdown";
import { BankBreakdown } from "@/components/dashboard/banks/BankBreakdown";
import { HistoryBreakdown } from "@/components/dashboard/banks/HistoryBreakdown";
import { BankTrends } from "@/components/dashboard/banks/trends";
import {
  Plus,
  PieChart,
  BarChart3,
  Building,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryParams } from "@/lib/hooks/useQueryParams";

const SECTIONS = [
  { key: "budgets", label: "Budgets", icon: PieChart },
  { key: "categories", label: "Categories", icon: BarChart3 },
  { key: "banks", label: "Banks", icon: Building },
  { key: "history", label: "History", icon: CalendarDays },
  { key: "trends", label: "Trends", icon: TrendingUp },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

export default function Page() {
  const title = "Funds - Dashboard";
  const { queryParams, setQueryParams } = useQueryParams({
    defaultValues: { section: "budgets" },
  });
  const activeSection = (queryParams.section as SectionKey) ?? "budgets";
  const setActiveSection = (key: SectionKey) =>
    setQueryParams({ section: key });

  return (
    <div className="text-slate-200 min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 mb-20 md:mb-0">
      <title>{title}</title>
      <div className="flex flex-col gap-3 h-fit p-2">
        <UpcomingPlannedTransactions />
        <UpcomingVoiceDrafts />
        <Onboarding />
        <div className="grid grid-cols-1 lg:grid-cols-1 xl:grid-cols-2 gap-3">
          <AssetSummary />

          {/* Right-hand section: flat pill navigation */}
          <div className="relative w-full">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl pointer-events-none" />
            <div className="relative z-10 w-full">
              {/* Pill navigation */}
              <div className="flex flex-wrap items-center gap-1 mb-3 p-1 w-fit rounded-lg bg-slate-800/60 backdrop-blur-sm border border-slate-700/50">
                {SECTIONS.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.key}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-200",
                        activeSection === section.key
                          ? "bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-slate-100 shadow-sm"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/40",
                      )}
                      onClick={() => setActiveSection(section.key)}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {section.label}
                    </button>
                  );
                })}
              </div>

              {/* Content — only the active section renders */}
              {activeSection === "budgets" && <BudgetsSummary />}
              {activeSection === "categories" && <CategoryBreakdown />}
              {activeSection === "banks" && <BankBreakdown />}
              {activeSection === "history" && <HistoryBreakdown />}
              {activeSection === "trends" && <BankTrends />}
            </div>
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
      <VoiceDraftPrefillHandler />
    </div>
  );
}
