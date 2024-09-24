"use client";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import clsx from "clsx";
import { parseAmount, trimToTwoDecimals } from "@/lib/utils";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import Link from "next/link";
import { Skeleton } from "../ui/skeleton";
import { Button } from "../ui/button";
import { RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const BankSummary = () => {
  const queryClient = useQueryClient();
  const { isPrivacyModeEnabled } = usePrivacyMode();
  const { bankData, baseCurrency } = useBanksCategsContext();
  const { banks } = bankData || {};
  const totalAmount =
    banks?.reduce((acc, bank) => {
      return acc + bank.balance;
    }, 0) || 0;

  if (bankData?.loading) {
    return (
      <div className="flex flex-col gap-3 w-full ">
        <Skeleton className="h-8 w-[155px] bg-slate-800" />
        <Skeleton className="h-9 w-full bg-slate-800" />
        <div className="grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-3 sm:grid-cols-3 grid-cols-2 gap-2">
          {Array.from({ length: 9 }).map((_, index) => {
            return (
              <Skeleton key={index} className="h-14 w-full bg-slate-800" />
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full ">
      <div className="flex flex-row gap-3">
        <h1 className="text-slate-100 text-xl font-semibold">Banks Summary</h1>{" "}
        <Button
          className="rounded-full p-2 h-fit hover:bg-slate-700 group"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ["banks"] });
          }}
        >
          <RotateCw className="size-4 group-hover:rotate-180 transition-all" />
        </Button>
      </div>

      {banks?.length === 0 ? (
        <p className="text-slate-400">
          No banks added, visit the banks page and add.
        </p>
      ) : (
        <>
          <div className="flex flex-row rounded-md overflow-hidden">
            {banks?.map((bank, index) => {
              return (
                <ProgressSection
                  key={bank.name}
                  percentage={(bank.balance / totalAmount) * 100}
                  color={colorsArray[index]}
                />
              );
            })}
          </div>
          <div className="grid xl:grid-cols-3 lg:grid-cols-2 md:grid-cols-3 sm:grid-cols-3 grid-cols-2 gap-2">
            {banks?.map((bank, index) => {
              return (
                <Link
                  href={`/dashboard/banks?bank=${bank.name}`}
                  key={bank.name}
                  className={
                    "flex flex-col gap-1.5 justify-between text-slate-100 bg-slate-800 rounded-md p-1 px-2 border-[7px] hover:bg-slate-600"
                  }
                  style={{
                    borderColor: colorsArray[index],
                    borderTop: 0,
                    borderBottom: 0,
                    borderRight: 0,
                  }}
                >
                  <p className="font-semibold text-ellipsis line-clamp-2">
                    {bank.name}
                  </p>
                  <div className="flex flex-row gap-2 w-full justify-between items-end flex-wrap">
                    <p className="text-sm">
                      {isPrivacyModeEnabled
                        ? `${baseCurrency?.symbol ?? "$"}••••••`
                        : parseAmount(bank.balance, baseCurrency?.code)}
                    </p>
                    <p className="text-xs">
                      {trimToTwoDecimals((bank.balance / totalAmount) * 100)}%
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export const colorsArray = [
  "orange",
  "red",
  "green",
  "blue",
  "teal",
  "violet",
  "indigo",
  "pink",
  "yellow",
  "lime",
  "cyan",
  "emerald",
  "purple",
  "fuchsia",
  "sky",
];

const ProgressSection = ({
  percentage,
  color,
}: {
  percentage: number;
  color?: string;
}) => {
  return (
    <div
      className="flex flex-row justify-center items-center h-10"
      style={{
        width: `${percentage}%`,
        backgroundColor: color,
      }}
    >
      <small
        className={clsx({
          hidden: percentage < 10,
        })}
      >
        {trimToTwoDecimals(percentage)}%
      </small>
    </div>
  );
};
