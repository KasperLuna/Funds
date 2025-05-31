"use client";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MonthlyBreakdown } from "@/components/dashboard/banks/MonthlyBreakdown";
import { BankTrends } from "@/components/dashboard/banks/trends";

const TABS = [
  { key: "breakdown", label: "Breakdown" },
  { key: "trends", label: "Trends" },
];

export const BankMonthlies = () => {
  const [tab, setTab] = useState("breakdown");
  return (
    <div className="w-full">
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex flex-col gap-2">
          <h1 className="text-slate-100 text-xl font-semibold">Bank Monthly</h1>
          <TabsList className="mb-2 w-fit bg-transparent fill-slate-200">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key}>
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="breakdown">
          <MonthlyBreakdown />
        </TabsContent>
        <TabsContent value="trends">
          <BankTrends />
        </TabsContent>
      </Tabs>
    </div>
  );
};
