"use client";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import clsx from "clsx";
import { parseAmount, trimToTwoDecimals } from "@/lib/utils";
import { usePrivacyMode } from "@/lib/hooks/usePrivacyMode";
import Link from "next/link";
import { RotateCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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
      <div className="flex flex-row justify-between">
        <div className="flex flex-row gap-3">
          <h1 className="text-slate-100 text-xl font-semibold">
            Banks Summary
          </h1>{" "}
          <Button
            className="rounded-full p-2 h-fit hover:bg-slate-700 group"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ["banks"] });
            }}
          >
            <RotateCw className="size-4 group-hover:rotate-180 transition-all" />
          </Button>
        </div>{" "}
        <small className="text-slate-200 bg-slate-700 h-fit px-2 border-2 border-slate-600 rounded-full">
          Total:{" "}
          <span className="font-mono">
            {isPrivacyModeEnabled
              ? `${baseCurrency?.symbol ?? "$"}••••••`
              : parseAmount(totalAmount, baseCurrency?.code)}
          </span>
        </small>
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
                  prefetch={false}
                  key={bank.name}
                  className={
                    "flex flex-col gap-1.5 justify-between text-slate-100 bg-slate-800 rounded-md p-1 px-2 border-[2.5px] hover:bg-slate-700 transition-colors"
                  }
                  style={{
                    borderColor: colorsArray[index],
                    borderTop: 0,
                    borderBottom: 0,
                    borderRight: 0,
                    boxShadow: `0 2px 8px 0 ${colorsArray[index]}22`, // subtle colored shadow
                  }}
                >
                  <p className="font-semibold text-ellipsis line-clamp-2">
                    {bank.name}
                  </p>
                  <div className="flex flex-row gap-2 w-full justify-between items-end flex-wrap">
                    <p className="text-sm font-mono">
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
  "#f59e42", // muted orange
  "#ef4444", // soft red
  "#22c55e", // soft green
  "#3b82f6", // soft blue
  "#14b8a6", // teal
  "#a78bfa", // violet
  "#6366f1", // indigo
  "#ec4899", // pink
  "#eab308", // muted yellow
  "#84cc16", // lime
  "#06b6d4", // cyan
  "#10b981", // emerald
  "#8b5cf6", // purple
  "#f472b6", // fuchsia
  "#38bdf8", // sky blue
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
        className={clsx(
          {
            hidden: percentage < 10,
          },
          "font-mono text-xs"
        )}
        style={{
          textShadow: "0 1px 1px rgba(0,0,0,0.7), 0 0px 1px rgba(0,0,0,0.7)",
        }}
      >
        {trimToTwoDecimals(percentage)}%
      </small>
    </div>
  );
};
