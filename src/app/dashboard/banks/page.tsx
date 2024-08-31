"use client";

import { Button } from "@/components/ui/button";
import { Plus, Table } from "lucide-react";
import React, { useCallback, useState } from "react";
import { BanksHeader } from "@/components/banks/BanksHeader";
import { AddTransactionDialog } from "@/components/banks/AddTransactionDialog";
import { AddBankCategDropdown } from "@/components/banks/AddBankCategDropdown";
import { TransactionsContainer } from "@/components/banks/transactions/TransactionsContainer";
import { BankStatsSection } from "@/components/dashboard/banks/BankStatsSection";
import { TransactionFilter } from "@/components/banks/transactions/TransactionFilter";

export default function Page() {
  return (
    <div>
      <BanksHeader />
      <BankStatsSection />
      <p className="text-slate-100 text-lg">Transactions</p>
      <div className="py-2 sticky md:top-0 gap-2 top-[58.8px] bg-slate-950 h-full w-full bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-70 z-[1000]">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row flex-wrap gap-2 w-full">
            <div className="flex gap-2">
              <Button
                className="px-2 border-2 border-slate-800"
                onClick={() => alert("TODO")}
              >
                <Table />
              </Button>
              <TransactionFilter />
            </div>
          </div>

          <div className="flex-row md:flex hidden">
            <AddTransactionDialog>
              <Button className="bg-orange-500 hover:bg-orange-400 rounded-r-none px-7">
                Add
              </Button>
            </AddTransactionDialog>
            <AddBankCategDropdown />
          </div>
        </div>
      </div>

      <TransactionsContainer />

      <div className="flex md:hidden fixed bottom-[95px] z-[2000] right-5">
        <AddTransactionDialog>
          <Button className="px-2 bg-orange-500 rounded-full w-14 h-14 hover:bg-orange-600">
            <Plus />
          </Button>
        </AddTransactionDialog>
      </div>
    </div>
  );
}
