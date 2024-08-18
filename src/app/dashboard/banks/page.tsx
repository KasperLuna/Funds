"use client";

import { StatCard } from "@/components/dashboard/banks/BankStatCard";
import { TransactionCard } from "@/components/dashboard/banks/TransactionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronDown, Filter, Plus, Table } from "lucide-react";
import React, { useState } from "react";
import { useTransactionsQuery } from "@/lib/firebase/firestore";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { BanksHeader } from "@/components/banks/BanksHeader";
import { MonthPicker } from "@/components/banks/MonthPicker";
import dayjs from "dayjs";
import { AppTxTypes, FirebaseTxTypes } from "@/lib/types";

export default function Page() {
  const [selectedPeriod, setSelectedPeriod] = useState("latest");
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());

  const { bankData, categoryData } = useBanksCategsContext();
  const { banks } = bankData || {};
  const { categories } = categoryData || {};
  const { transactions } = useTransactionsQuery(
    selectedPeriod === "latest" ? "latest" : selectedMonth
  );
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  // group transactions according to if theyre in the same day
  const groupedTransactions = Object.values(
    transactions?.reduce(
      (acc: { [key: string]: AppTxTypes[] }, transaction: FirebaseTxTypes) => {
        const date = new Date(
          dayjs(transaction.date.seconds * 1000).format()
        ).toDateString();
        if (!acc[date]) {
          acc[date] = [];
        }

        acc[date].push({
          ...transaction,
          date: new Date(transaction.date.seconds * 1000),
        });

        return acc;
      },
      {}
    )
  );

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
      <p className="text-slate-100 text-lg">Transactions</p>
      <div className="py-2 sticky md:top-0 gap-2 top-[58.8px] bg-slate-950 h-full w-full bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-70">
        <div className="flex flex-row justify-between">
          <div className="flex flex-row flex-wrap gap-2 w-full">
            <div className="flex gap-2">
              <Button className="px-2 border-2 border-slate-800">
                <Table />
              </Button>

              <Button className="px-2  border-2 border-slate-800">
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
        className="grid pb-20 md:pb-0 w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[200px] px-[2px] py-1"
      >
        {groupedTransactions?.map((transactions) => {
          if (transactions.length > 1) {
            return (
              <div
                id={`transaction-group-${transactions[0].date.toDateString()}`}
                key={transactions[0].date.toDateString()}
                className="col-span-full py-2 flex gap-2 flex-col"
              >
                <h4 className="text-slate-100 text-lg">
                  {dayjs(transactions[0].date).format("dddd, MMMM D")}
                </h4>
                <div className="hover:outline-slate-400 transition-all rounded-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-2 outline-dashed outline-[1.5px] outline-slate-600 border-slate-200">
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
              </div>
            );
          }

          const isHideable = transactions[0].category?.some((categ) =>
            hideableCategories?.includes(categ)
          );

          return (
            <TransactionCard
              key={transactions[0].id}
              {...transactions[0]}
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
