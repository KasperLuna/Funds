import { useTransactionsQuery } from "@/lib/hooks/useTransactionsQuery";
import { ExpandedTransaction } from "@/lib/types";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { TransactionCard } from "./TransactionCard";
import { TransactionGroupDisplay } from "./TransactionGroupDisplay";
import { Button } from "@/components/ui/button";
import { TransactionCardLoader } from "./TransactionCardLoader";

export const TransactionsContainer = () => {
  const [parent] = useAutoAnimate({ duration: 100 });
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isLoading,
    isRefetching,
    isFetchingNextPage,
  } = useTransactionsQuery();

  const groupedTransactions = Object.values(
    data?.pages
      .flatMap((page) => page.items)
      .reduce(
        (
          acc: { [key: string]: ExpandedTransaction[] },
          transaction: ExpandedTransaction
        ) => {
          const date = transaction.date.split(" ")[0];
          acc[date] = acc[date] || [];
          acc[date].push(transaction);
          return acc;
        },
        {}
      ) || {}
  );

  if (isRefetching) {
    return (
      <div
        id="transactions-container"
        className="grid pb-20 md:pb-0 w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[150px] px-[2px] py-1 z-0"
      >
        {[...Array(8)].map((_, index) => (
          <TransactionCardLoader key={index} />
        ))}
      </div>
    );
  }

  return (
    <div
      id="transactions-container"
      className="grid pb-20 md:pb-0 w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[150px] px-[2px] py-1 z-0"
      ref={parent}
    >
      {!isLoading && groupedTransactions?.length === 0 && (
        <div className="w-full flex items-center justify-center col-span-full h-[300px] flex-col  text-center gap-3">
          <h4 className=" text-2xl text-slate-400">No transactions yet!</h4>
          <p className="text-slate-500">
            Click the "Add" button (or plus on mobile) to add banks and
            transactions to get started.
          </p>
        </div>
      )}

      {groupedTransactions?.map((transactions) => {
        if (transactions.length > 1) {
          return (
            <TransactionGroupDisplay
              key={new Date(transactions[0].date).toDateString()}
              transactions={transactions}
            />
          );
        }

        return (
          <TransactionCard key={transactions[0].id} {...transactions[0]} />
        );
      })}

      {(isLoading || isFetchingNextPage) &&
        [...Array(4)].map((_, index) => <TransactionCardLoader key={index} />)}
      <div className="col-span-full flex items-center justify-center">
        {hasNextPage && (
          <Button
            className="w-full border-slate-700 border-2 hover:bg-slate-800"
            onClick={() => fetchNextPage()}
          >
            Load More
          </Button>
        )}
      </div>
    </div>
  );
};
