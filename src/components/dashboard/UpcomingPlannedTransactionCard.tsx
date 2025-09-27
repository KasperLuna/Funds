import React from "react";
import { Category, Currency, PlannedTransaction } from "@/lib/types";

interface UpcomingPlannedTransactionCardProps {
  pt: PlannedTransaction;
  categories: Category[];
  baseCurrency: Currency | undefined;
  isPrivate: boolean;
  parseAmount: (amount: number, code?: string) => string;
}

const UpcomingPlannedTransactionCard: React.FC<
  UpcomingPlannedTransactionCardProps
> = ({ pt, categories, baseCurrency, isPrivate, parseAmount }) => {
  return (
    <div
      role="button"
      className="group relative transition-all flex-grow h-full text-slate-200 border-2 gap-2 border-slate-600/50 hover:border-slate-500/70 rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-700/50 hover:bg-gradient-to-br hover:from-slate-700/80 hover:to-slate-600/60 hover:cursor-pointer overflow-hidden hover:shadow-lg hover:shadow-slate-900/50 hover:scale-[1.01] duration-300"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <div className="relative z-10 flex flex-col gap-2 p-2">
        <div className="flex flex-row w-full items-center justify-between gap-2 min-w-0">
          <div className="flex flex-col text-start min-w-0 flex-shrink">
            <div className="flex flex-row items-center gap-2">
              <p className="text-nowrap text-sm font-medium">
                {pt?.invokeDate.toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="h-px bg-slate-600/60 my-1" />
            <p className="text-xs mt-0.5 text-slate-400 truncate">
              {pt.recurrence.frequency.charAt(0).toUpperCase() +
                pt.recurrence.frequency.slice(1).toLowerCase()}
            </p>
          </div>
          <div className="flex flex-col text-right min-w-0 flex-1">
            <p
              className={
                pt.amount < 0
                  ? "text-lg font-semibold font-mono text-red-400 truncate"
                  : "text-lg font-semibold font-mono text-emerald-400 truncate"
              }
            >
              {isPrivate
                ? `${baseCurrency?.symbol ?? "$"}••••••`
                : parseAmount(pt.amount, baseCurrency?.code)}
            </p>
            <small className="text-slate-300 truncate">
              {pt.description && pt.description.length > 30 ? (
                pt.description.slice(0, 30) + "..."
              ) : pt.description ? (
                pt.description
              ) : (
                <span className="italic text-slate-400">(No description)</span>
              )}
            </small>
          </div>
        </div>
        <div className="flex flex-row flex-wrap w-full bg-slate-800/60 backdrop-blur-sm rounded-md p-1 gap-1 border border-slate-600/50 min-h-6">
          {(Array.isArray(pt.categories) ? pt.categories : [pt.categories])
            .filter(Boolean)
            .slice(0, 3)
            .map((catId: string) => {
              const cat = categories.find(
                (c) => c.id === catId || c.name === catId
              );
              return (
                <small
                  key={catId}
                  className="bg-slate-600/80 hover:bg-slate-500/80 rounded-full whitespace-nowrap px-2 py-0.5 transition-colors duration-200 text-xs truncate max-w-[80px]"
                  title={cat ? cat.name : catId}
                >
                  {cat ? cat.name : catId}
                </small>
              );
            })}
          {(Array.isArray(pt.categories)
            ? pt.categories
            : [pt.categories]
          ).filter(Boolean).length > 3 && (
            <small className="bg-slate-500/60 rounded-full text-xs px-2 py-0.5 text-slate-300">
              +
              {(Array.isArray(pt.categories)
                ? pt.categories
                : [pt.categories]
              ).filter(Boolean).length - 3}
            </small>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpcomingPlannedTransactionCard;
