import { ExpandedTransaction } from "@/lib/types";
import dayjs from "dayjs";
import clsx from "clsx";
import { usePrivacy } from "@/hooks/usePrivacy";
import { parseAmount } from "@/lib/utils";
import { MixedDialogTrigger } from "../MixedDialog";
import { useUserQuery } from "@/lib/hooks/useUserQuery";

export const TransactionCard = (props: ExpandedTransaction) => {
  const { isPrivate } = usePrivacy();
  const { baseCurrency } = useUserQuery();
  const { date, amount, description, expand } = props;
  const { bank, categories } = expand || {};
  const isHideable = categories?.some((categ) => categ.hideable);

  return (
    <MixedDialogTrigger transaction={props}>
      <div
        role="button"
        id="transaction-card"
        className="group relative flex flex-col justify-between transition-all flex-grow h-full text-slate-200 p-2 border-2 gap-2 border-slate-600/50 hover:border-slate-500/70 rounded-xl bg-gradient-to-br from-slate-800/70 to-slate-700/50 hover:bg-gradient-to-br hover:from-slate-700/80 hover:to-slate-600/60 hover:cursor-pointer overflow-hidden hover:shadow-lg hover:shadow-slate-900/50 hover:scale-[1.01] duration-300"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        <div className="relative z-10 flex flex-row w-full items-center justify-between gap-2 min-w-0">
          <div className="flex flex-col text-start min-w-0 flex-shrink">
            <p className="text-nowrap text-sm font-medium">
              {dayjs(date).format("MMM D")}
            </p>
            <div className="h-px bg-slate-600/60 my-1" />
            <small className="text-slate-400 truncate">{bank?.name}</small>
          </div>
          <div className="flex flex-col text-right min-w-0 flex-1">
            <p
              className={clsx("text-lg font-semibold font-mono truncate", {
                "text-red-400": amount < 0,
                "text-emerald-400": amount > 0,
              })}
            >
              {isHideable && isPrivate
                ? `${baseCurrency?.symbol ?? "$"}••••••`
                : parseAmount(amount, baseCurrency?.code)}
            </p>
            <small className="text-slate-300 truncate">
              {description.length > 30
                ? description.slice(0, 30) + "..."
                : description}
            </small>
          </div>
        </div>
        <div className="relative z-10 flex flex-row flex-wrap w-full bg-slate-800/60 backdrop-blur-sm rounded-md p-1 gap-1 border border-slate-600/50 min-h-6">
          {categories?.slice(0, 3).map((category) => (
            <small
              key={category.id}
              className={clsx(
                "bg-slate-600/80 hover:bg-slate-500/80 rounded-full whitespace-nowrap transition-colors duration-200 text-xs px-2 py-0.5 truncate max-w-[80px]",
                {
                  "": !!category,
                }
              )}
              title={category?.name}
            >
              {category?.name}
            </small>
          ))}
          {categories && categories.length > 3 && (
            <small className="bg-slate-500/60 rounded-full text-xs px-2 py-0.5 text-slate-300">
              +{categories.length - 3}
            </small>
          )}
        </div>
      </div>
    </MixedDialogTrigger>
  );
};
