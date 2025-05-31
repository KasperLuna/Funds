import React from "react";
import { Category, Currency, PlannedTransaction } from "@/lib/types";

interface UpcomingPlannedTransactionCardProps {
  pt: PlannedTransaction;
  categories: Category[];
  baseCurrency: Currency | undefined;
  isPrivacyModeEnabled: boolean;
  parseAmount: (amount: number, code?: string) => string;
}

const UpcomingPlannedTransactionCard: React.FC<
  UpcomingPlannedTransactionCardProps
> = ({ pt, categories, baseCurrency, isPrivacyModeEnabled, parseAmount }) => {
  return (
    <div
      role="button"
      className={`transition-all flex-grow h-full text-slate-200 border-2 gap-2 border-slate-700 hover:border-slate-600 rounded-xl hover:bg-slate-800 hover:cursor-pointer overflow-clip`}
    >
      <div className="flex flex-col gap-2 p-2">
        <div className="flex flex-row w-full items-center justify-between gap-2">
          <div className="flex flex-col text-start">
            <div className="flex flex-row items-center gap-2">
              <p className="text-nowrap">
                {pt?.invokeDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="h-[1px] w-full bg-slate-700 my-1" />
            <p className="text-xs mt-0.5">
              {pt.recurrence.frequency.charAt(0).toUpperCase() +
                pt.recurrence.frequency.slice(1).toLowerCase()}
            </p>
          </div>
          <div className="flex flex-col text-right">
            <p
              className={
                pt.amount < 0
                  ? "text-lg font-semibold font-mono text-red-400"
                  : "text-lg font-semibold font-mono text-green-400"
              }
            >
              {isPrivacyModeEnabled
                ? `${baseCurrency?.symbol ?? "$"}••••••`
                : parseAmount(pt.amount, baseCurrency?.code)}
            </p>
            <small className="text-balance">
              {pt.description && pt.description.length > 50 ? (
                pt.description.slice(0, 50) + "..."
              ) : pt.description ? (
                pt.description
              ) : (
                <span className="italic text-slate-400">(No description)</span>
              )}
            </small>
          </div>
        </div>
        <div className="flex flex-row flex-wrap w-full bg-slate-900 rounded-md p-1 gap-2 border-2 border-slate-700 min-h-8">
          {(Array.isArray(pt.categories) ? pt.categories : [pt.categories])
            .filter(Boolean)
            .map((catId: string) => {
              const cat = categories.find(
                (c) => c.id === catId || c.name === catId
              );
              return (
                <small
                  key={catId}
                  className="bg-slate-600 rounded-full whitespace-nowrap px-2"
                >
                  {cat ? cat.name : catId}
                </small>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default UpcomingPlannedTransactionCard;
