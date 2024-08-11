"use client";

import { StatCard } from "@/components/dashboard/banks/BankStatCard";
import { TransactionCard } from "@/components/dashboard/banks/TransactionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
  Table,
} from "lucide-react";
import React, { useState } from "react";
import { useTransactionsQuery } from "@/lib/firebase/firestore";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { BanksHeader } from "@/components/banks/BanksHeader";

const TRANSACTION_TEMPLATE = {
  date: "Mar 2",
  bank: "Maya",
  amount: "P 20,000",
  description: "I got some money",
  tags: ["wow", "cool", "it", "works"],
};

const BANK_TEMPLATE = {
  bank: "Maya",
  amount: "P 200,000",
  percent: "20%",
};

export default function Page() {
  const [selectedPeriod, setSelectedPeriod] = useState("latest");

  const { bankData, categoryData } = useBanksCategsContext();
  const { banks } = bankData || {};
  const { categories } = categoryData || {};
  const { transactions } = useTransactionsQuery();
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  const hideableCategories = categories
    ?.filter((categ) => categ.hideable)
    .map((categ) => categ.name);

  return (
    <div>
      <BanksHeader />
      <div
        id="bank-stats-section"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 pb-3"
      >
        {banks?.map((bank) => (
          <StatCard
            key={bank.name}
            {...bank}
            percentage={`${((bank.balance / totalAmount) * 100).toPrecision(2)}%`}
          />
        ))}
      </div>
      <div className="pb-3 sticky md:top-0 gap-2 top-[58.8px] bg-slate-950 h-full w-full bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-70">
        <p className="text-slate-100 text-lg pb-2">Transactions</p>
        <div className="flex flex-row justify-between">
          <div className="flex flex-row flex-wrap gap-2 md:justify-start justify-between w-full">
            <div className="flex gap-2">
              <Button className="px-2 border-2 border-slate-800">
                <Table />
              </Button>

              <Button className="px-2  border-2 border-slate-800">
                <Filter />
              </Button>
            </div>
            <div className="flex flex-row gap-2 ">
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
              {selectedPeriod !== "latest" && (
                <div className="flex flex-row">
                  <Button className="rounded-r-none px-1 bg-slate-800">
                    <ChevronLeft />
                  </Button>
                  <Button className="px-3 border-slate-800 gap-1 rounded-none">
                    Mar 2023
                    <Calendar className="w-3 h-3" />
                  </Button>
                  <Button className="rounded-l-none px-1 bg-slate-800">
                    <ChevronRight />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex-row md:flex hidden">
            <Button className="bg-orange-500 hover:bg-orange-400 rounded-r-none px-7">
              Add
            </Button>
            <Button className="rounded-l-none px-2 border-2 border-l-0 border-slate-800">
              <ChevronDown />
            </Button>
          </div>
        </div>
      </div>
      <div
        id="transactions-container"
        className="grid pb-20 md:pb-0 w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[200px] overflow-auto"
      >
        {transactions.map((transaction) => {
          const isHideable = transaction.category?.some((categ) =>
            hideableCategories?.includes(categ)
          );
          return (
            <TransactionCard
              key={transaction.id}
              {...transaction}
              isHideable={isHideable}
            />
          );
        })}
      </div>

      <div className="flex md:hidden fixed bottom-[95px] right-5">
        <Button className="px-2 bg-orange-500 rounded-full w-14 h-14 hover:bg-orange-600">
          <Plus />
        </Button>
      </div>
    </div>
  );
}
