"use client";

import { StatCard } from "@/components/BankStatCard";
import { TransactionCard } from "@/components/TransactionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import clsx from "clsx";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Filter,
  Plus,
  Scale,
  Table,
} from "lucide-react";
import { Metadata } from "next";
import { useState } from "react";

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
  const [isPricesVisible, setIsPricesVisible] = useState(false);
  const [banksStats, setBanksStats] = useState([BANK_TEMPLATE]);
  const [transactions, setTransactions] = useState([TRANSACTION_TEMPLATE]);
  const [selectedPeriod, setSelectedPeriod] = useState("latest");

  return (
    <div>
      <div className="flex flex-row w-full justify-between items-center pb-3">
        <div className="flex flex-row gap-2 items-center text-slate-100">
          <Button
            onClick={() => setIsPricesVisible(!isPricesVisible)}
            className={clsx("px-2 border-2 hover:border-slate-600 rounded-lg", {
              "border-blue-600": isPricesVisible,
              "border-red-500": !isPricesVisible,
            })}
          >
            {isPricesVisible ? <EyeOff /> : <Eye />}
          </Button>
          <h1 className="md:text-4xl text-2xl font-semibold">Balances</h1>
        </div>
        <small className="text-slate-200 bg-slate-700 h-fit px-2 border-2 border-slate-600 rounded-full">
          Total: P 1,000,000
        </small>
      </div>
      <div className="flex flex-row flex-wrap gap-2 pb-3">
        {banksStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>
      <div className="pb-3 sticky md:top-0 gap-2 top-16 bg-slate-950">
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
            <Button
              className="bg-orange-500 hover:bg-orange-400 rounded-r-none px-7"
              onClick={() =>
                setTransactions([...transactions, TRANSACTION_TEMPLATE])
              }
            >
              Add
            </Button>
            <Button
              className="rounded-l-none px-2 border-2 border-l-0 border-slate-800"
              onClick={() => setBanksStats([...banksStats, BANK_TEMPLATE])}
            >
              <ChevronDown />
            </Button>
          </div>
          <div className="flex md:hidden fixed bottom-24 right-5">
            <Button
              className="px-2 bg-orange-500 rounded-full w-14 h-14 hover:bg-orange-600"
              onClick={() =>
                setTransactions([...transactions, TRANSACTION_TEMPLATE])
              }
            >
              <Plus />
            </Button>
          </div>
        </div>
      </div>
      <div
        id="transactions-container"
        className="grid pb-20 md:pb-0 w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[200px] overflow-auto"
      >
        {transactions.map((transaction, index) => (
          <TransactionCard key={index} {...transaction} />
        ))}
      </div>
    </div>
  );
}
