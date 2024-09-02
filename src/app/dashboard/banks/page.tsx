"use client";

import { Button } from "@/components/ui/button";
import { Plus, Table } from "lucide-react";
import React, { useCallback, useState } from "react";
import { BanksHeader } from "@/components/banks/BanksHeader";
import { MixedDialogTrigger } from "@/components/banks/MixedDialog";
import { TransactionsContainer } from "@/components/banks/transactions/TransactionsContainer";
import { BankStatsSection } from "@/components/dashboard/banks/BankStatsSection";
import { TransactionFilter } from "@/components/banks/transactions/TransactionFilter";
import dynamic from "next/dynamic";

function Page() {
  return (
    <div>
      <BanksHeader />
      <BankStatsSection />
      <p className="text-slate-100 text-lg">Transactions</p>
      <div className="py-2 sticky md:top-0 gap-2 top-[58.8px] bg-slate-950 h-full w-full bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-70 z-10">
        <div className="flex flex-row justify-between">
          <TransactionFilter />
          <div className="flex-row md:flex hidden">
            <MixedDialogTrigger>
              <Button className="bg-orange-500 hover:bg-orange-400 px-7">
                Add
              </Button>
            </MixedDialogTrigger>
          </div>
        </div>
      </div>

      <TransactionsContainer />

      <div className="flex md:hidden fixed bottom-[95px] z-50 right-5">
        <MixedDialogTrigger>
          <Button className="px-2 bg-orange-500 rounded-full w-14 h-14 hover:bg-orange-600">
            <Plus />
          </Button>
        </MixedDialogTrigger>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(Page), {
  ssr: false,
});
