import { ExpandedTransaction } from "@/lib/types";
import dayjs from "dayjs";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { TransactionCard } from "@/components/banks/transactions/TransactionCard";
import Decimal from "decimal.js";
import { useBanksCategsContext } from "@/lib/hooks/useBanksCategsContext";
import { parseAmount } from "@/lib/utils";
import { usePrivacy } from "@/hooks/usePrivacy";
import clsx from "clsx";

export const TransactionGroupDisplay = ({
  transactions,
}: {
  transactions: ExpandedTransaction[];
}) => {
  const [parent] = useAutoAnimate({ duration: 100 });
  const { baseCurrency } = useBanksCategsContext();
  const { isPrivate } = usePrivacy();

  const total = transactions.reduce((acc, transaction) => {
    return new Decimal(acc).add(new Decimal(transaction.amount)).toNumber();
  }, 0);

  return (
    <div
      id={`transaction-group-${new Date(transactions[0].date).toDateString()}`}
      key={new Date(transactions[0].date).toDateString()}
      className="col-span-full py-2 flex gap-2 flex-col"
    >
      <div className="flex flex-row justify-between text-slate-100 items-end">
        <h4 className="text-lg">
          {dayjs(transactions[0].date).format("dddd, MMMM D")}
        </h4>
        <p
          className={clsx("text-sm", {
            "text-red-400": total < 0,
            "text-green-400": total > 0,
          })}
        >
          <span className="text-slate-100">Total: </span>
          {isPrivate
            ? `${baseCurrency?.symbol}••••••`
            : parseAmount(total, baseCurrency?.code)}
        </p>
      </div>

      <div
        ref={parent}
        className="hover:outline-slate-400 transition-all rounded-xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-2 outline-dashed outline-[1.5px] outline-slate-600 border-slate-200"
      >
        {transactions.map((transaction) => {
          return <TransactionCard key={transaction.id} {...transaction} />;
        })}
      </div>
    </div>
  );
};
