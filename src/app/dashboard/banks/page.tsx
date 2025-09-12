"use client";

import { Button } from "@/components/ui/button";
import { Plus, RotateCw } from "lucide-react";
import React from "react";
import { BanksHeader } from "@/components/banks/BanksHeader";
import { MixedDialogTrigger } from "@/components/banks/MixedDialog";
import { TransactionsContainer } from "@/components/banks/transactions/TransactionsContainer";
import { StatsSection } from "@/components/dashboard/banks/stats";
import { TransactionFilter } from "@/components/banks/transactions/TransactionFilter";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";

function Page() {
  const title = "Funds - Banks";
  const queryClient = useQueryClient();
  return (
    <div className="min-h-screen">
      <title>{title}</title>
      <div className="relative">
        <div className="absolute inset-0 pointer-events-none" />
        <div className="relative z-10 space-y-2 p-2">
          <BanksHeader />
          <StatsSection />

          <div className="flex items-center gap-2 p-1">
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg bg-slate-800/60 backdrop-blur-sm border border-slate-700/50">
              <p className="text-slate-100 text-base font-semibold">
                Transactions
              </p>
              <Button
                className="rounded-full p-1 h-fit bg-slate-700/60 hover:bg-slate-600/80 border border-slate-600/50 hover:border-slate-500/70 group transition-all duration-300"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["transactions"] });
                }}
              >
                <RotateCw className="size-4 group-hover:rotate-180 transition-all duration-500 text-emerald-400" />
              </Button>
            </div>
          </div>

          <div className="py-2 sticky md:top-0 gap-2 top-[58.8px] bg-slate-950/90 backdrop-filter backdrop-blur-md bg-opacity-80 z-10 border border-slate-950">
            <div className="flex flex-row justify-between px-3">
              <TransactionFilter />
              <div className="flex-row md:flex hidden">
                <MixedDialogTrigger>
                  <Button className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 px-6 py-2 shadow-lg hover:shadow-emerald-500/25 transition-all duration-300">
                    Add
                  </Button>
                </MixedDialogTrigger>
              </div>
            </div>
          </div>

          <TransactionsContainer />
        </div>
      </div>

      <div className="flex md:hidden fixed bottom-[95px] z-50 right-5">
        <MixedDialogTrigger>
          <Button className="px-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 rounded-full w-14 h-14 shadow-lg hover:shadow-emerald-500/30 hover:scale-110 transition-all duration-300">
            <Plus className="text-white" />
          </Button>
        </MixedDialogTrigger>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(Page), {
  ssr: false,
});
