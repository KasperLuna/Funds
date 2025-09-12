"use client";
import { useState, memo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MonthlyBreakdown } from "@/components/dashboard/banks/MonthlyBreakdown";
import { BankTrends } from "@/components/dashboard/banks/trends";
import { Building, TrendingUp, BarChart3 } from "lucide-react";

const TABS = [
  { key: "breakdown", label: "Breakdown", icon: BarChart3 },
  { key: "trends", label: "Trends", icon: TrendingUp },
];

export const BankMonthlies = memo(function BankMonthlies() {
  const [tab, setTab] = useState("breakdown");
  return (
    <div className="relative w-full">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl pointer-events-none" />
      <Tabs value={tab} onValueChange={setTab}>
        <div className="relative z-10 flex flex-col gap-2">
          <div className="flex items-center gap-3 p-1">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/60 backdrop-blur-sm border border-slate-700/50">
              <Building className="w-4 h-4 text-emerald-400" />
              <h1 className="text-slate-100 text-base font-semibold">
                Bank Monthly
              </h1>
            </div>
          </div>
          <TabsList className="w-fit bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="flex items-center gap-2 data-[state=active]:bg-gradient-to-r data-[state=active]:text-slate-200 data-[state=active]:to-blue-500/20  transition-all duration-300"
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="breakdown" className="relative z-10 mt-2">
          <MonthlyBreakdown />
        </TabsContent>
        <TabsContent value="trends" className="relative z-10 mt-2">
          <BankTrends />
        </TabsContent>
      </Tabs>
    </div>
  );
});
