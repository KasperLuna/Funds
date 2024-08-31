"use client";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Filter, Plus, Table } from "lucide-react";
import React, { useState } from "react";
import { BanksHeader } from "@/components/banks/BanksHeader";
import { AddTransactionDialog } from "@/components/banks/AddTransactionDialog";
import { AddBankCategDropdown } from "@/components/banks/AddBankCategDropdown";
import { MonthPicker } from "@/components/MonthPicker";
import { TransactionsContainer } from "@/components/banks/transactions/TransactionsContainer";

export default function Page({
  params: { bankName },
}: {
  params: { bankName: string };
}) {
  const [selectedPeriod, setSelectedPeriod] = useState("latest");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  return (
    <div>
      <BanksHeader bankName={bankName} />
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

              <Button
                className="px-2  border-2 border-slate-800"
                onClick={() => alert("TODO")}
              >
                <Filter />
              </Button>
            </div>

            <div className="flex flex-row gap-2 ml-auto sm:ml-0">
              <Tabs
                role="navigation"
                value={selectedPeriod}
                onValueChange={(value) => setSelectedPeriod(value)}
                className="flex"
              >
                <TabsList className="gap-2 bg-slate-800 fill-slate-200">
                  <TabsTrigger value="latest">Latest</TabsTrigger>
                  <TabsTrigger value="by_month">By Month</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            {selectedPeriod !== "latest" && (
              <div className="flex xs:w-full justify-end md:w-fit ml-auto sm:ml-0">
                <MonthPicker date={selectedMonth} setDate={setSelectedMonth} />
              </div>
            )}
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

      <TransactionsContainer bankName={bankName} />

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
