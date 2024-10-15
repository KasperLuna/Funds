import { useEffect, useState, useCallback, useRef } from "react";
import { useTransactionsQuery } from "@/lib/hooks/useTransactionsQuery";
import { ExpandedTransaction } from "@/lib/types";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { TransactionCard } from "./TransactionCard";
import { TransactionGroupDisplay } from "./TransactionGroupDisplay";
import { TransactionCardLoader } from "./TransactionCardLoader";
import { Skeleton } from "@/components/ui/skeleton";
import dayjs from "dayjs";
import NextIntersectionObserver from "@/components/ui/next-intersection-observer";

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

  const [canFetchNext, setCanFetchNext] = useState(false);
  const isLocked = useRef(false); // Lock to prevent multiple fetches

  // Enable fetching after 200ms when not loading
  useEffect(() => {
    if (!isLoading) {
      const timer = setTimeout(() => setCanFetchNext(true), 100);
      return () => clearTimeout(timer);
    }
    setCanFetchNext(false);
  }, [isLoading]);

  // Fetch the next page with lock
  const handleFetchNextPage = useCallback(() => {
    if (
      hasNextPage &&
      canFetchNext &&
      !isLoading &&
      !isFetchingNextPage &&
      !isLocked.current
    ) {
      isLocked.current = true;
      fetchNextPage().finally(() => {
        setTimeout(() => {
          isLocked.current = false; // Release lock after delay
        }, 100);
      });
    }
  }, [hasNextPage, canFetchNext, isLoading, isFetchingNextPage, fetchNextPage]);

  const groupedTransactions = Object.values(
    data?.pages
      ?.flatMap((page) => page.items)
      ?.reduce(
        (
          acc: { [key: string]: ExpandedTransaction[] },
          transaction: ExpandedTransaction
        ) => {
          const date = dayjs(transaction.date).format("YYYY-MM-DD");
          acc[date] = acc[date] || [];
          acc[date].push(transaction);
          return acc;
        },
        {}
      ) || {}
  );

  return (
    <div
      id="transactions-container"
      className="grid pb-20 md:pb-0 w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[150px] px-[2px] py-1 z-0"
      ref={parent}
    >
      {isRefetching && (
        <Skeleton className="w-full col-span-full bg-slate-800 p-4 text-center text-slate-400 italic font-semibold">
          Updating Transactions...
        </Skeleton>
      )}

      {!isLoading && groupedTransactions?.length === 0 && (
        <div className="w-full flex items-center justify-center col-span-full h-[300px] flex-col text-center gap-3">
          <h4 className="text-2xl text-slate-400">No transactions yet!</h4>
          <p className="text-slate-500">
            {`Click the "Add" button (or plus on mobile) to add banks and
            transactions to get started.`}
          </p>
        </div>
      )}

      {groupedTransactions?.map((transactions) =>
        transactions.length > 1 ? (
          <TransactionGroupDisplay
            key={dayjs(transactions[0].date).toString()}
            transactions={transactions}
          />
        ) : (
          <TransactionCard key={transactions[0].id} {...transactions[0]} />
        )
      )}

      <NextIntersectionObserver
        classes="col-span-full"
        rootmargin="0px"
        thresholdValue={[0, 1]}
      >
        {(boundary) => {
          if (boundary === "topIn" || boundary === "bottomIn")
            handleFetchNextPage();
          return null;
        }}
      </NextIntersectionObserver>
      {(isLoading || isFetchingNextPage || hasNextPage) &&
        [...Array(4)].map((_, index) => <TransactionCardLoader key={index} />)}
    </div>
  );
};
