"use client";

import { StatCard } from "@/components/BankStatCard";
import { TransactionCard } from "@/components/TransactionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import clsx from "clsx";
import {
  ChevronDown,
  Edit,
  Eye,
  EyeOff,
  Filter,
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
  const [show, setShow] = useState(false);
  const [banksStats, setBanksStats] = useState([BANK_TEMPLATE]);
  const [transactions, setTransactions] = useState([TRANSACTION_TEMPLATE]);

  return (
    <div className="flex 2xl:container flex-col gap-4 max-h-full">
      <div className="flex flex-row w-full justify-between items-center">
        <div className="flex flex-row gap-2 items-center text-slate-100">
          <Button
            onClick={() => setShow(!show)}
            className={clsx("px-2 border-2 hover:border-slate-600 rounded-lg", {
              "border-blue-600": show,
              "border-red-500": !show,
            })}
          >
            {show ? <EyeOff /> : <Eye />}
          </Button>
          <h1 className="md:text-4xl text-2xl font-semibold">Balances</h1>
        </div>
        <small className="text-slate-200 bg-slate-700 h-fit px-2 border-2 border-slate-600 rounded-full">
          Total: P 1,000,000
        </small>
      </div>
      <div className="flex flex-row flex-wrap gap-2">
        {banksStats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="flex flex-col gap-3 md:overflow-hidden md:pb-5">
        <p className="text-slate-100 text-lg">Transactions</p>
        <div className="flex flex-row justify-between">
          <div className="flex flex-row gap-2">
            <Button className="px-2 border-2 border-slate-800">
              <Table />
            </Button>
            <div className="flex gap-2">
              <Button className="px-2  border-2 border-slate-800">
                <Filter />
              </Button>
            </div>
            <Tabs role="navigation" defaultValue="latest" className="flex">
              <TabsList className="gap-2 bg-slate-800 fill-slate-200">
                <TabsTrigger value="latest">Latest</TabsTrigger>
                <TabsTrigger value="by_month">By Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-row">
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
        </div>
        <div
          id="transactions-container"
          className="grid w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-auto"
        >
          {transactions.map((transaction, index) => (
            <TransactionCard key={index} {...transaction} />
          ))}
        </div>
      </div>
    </div>
  );
}
