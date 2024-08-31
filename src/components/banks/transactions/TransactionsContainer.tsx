import { useTransactionsQuery } from "@/lib/hooks/useTransactionsQuery";
import { ExpandedTransaction } from "@/lib/types";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { TransactionCard } from "./TransactionCard";
import { TransactionGroupDisplay } from "./TransactionGroupDisplay";
import { Button } from "@/components/ui/button";
import { TransactionCardLoader } from "./TransactionCardLoader";

export const TransactionsContainer = ({ bankName }: { bankName?: string }) => {
  const [parent] = useAutoAnimate({ duration: 100 });
  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useTransactionsQuery({
      ...(bankName && { bankName: decodeURI(bankName) }),
    });

  const groupedTransactions = Object.values(
    data?.pages
      .flatMap((page) => page.items)
      .reduce(
        (
          acc: { [key: string]: ExpandedTransaction[] },
          transaction: ExpandedTransaction
        ) => {
          const date = new Date(transaction.date).toDateString();
          if (!acc[date]) {
            acc[date] = [];
          }

          acc[date].push(transaction);

          return acc;
        },
        {}
      ) || {}
  );

  return (
    <div
      id="transactions-container"
      className="grid pb-20 md:pb-0 w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[200px] px-[2px] py-1 z-0"
      ref={parent}
    >
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
        [...Array(4)].map((_, index) => <TransactionCardLoader />)}
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
