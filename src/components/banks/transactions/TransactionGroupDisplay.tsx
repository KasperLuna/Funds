import { ExpandedTransaction } from "@/lib/types";
import dayjs from "dayjs";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { TransactionCard } from "@/components/banks/transactions/TransactionCard";

export const TransactionGroupDisplay = ({
  transactions,
}: {
  transactions: ExpandedTransaction[];
}) => {
  const [parent] = useAutoAnimate({ duration: 100 });

  return (
    <div
      id={`transaction-group-${new Date(transactions[0].date).toDateString()}`}
      key={new Date(transactions[0].date).toDateString()}
      className="col-span-full py-2 flex gap-2 flex-col"
    >
      <h4 className="text-slate-100 text-lg">
        {dayjs(transactions[0].date).format("dddd, MMMM D")}
      </h4>
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
