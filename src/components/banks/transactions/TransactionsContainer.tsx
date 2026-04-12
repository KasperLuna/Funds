import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useTransactionsQuery } from "@/lib/hooks/useTransactionsQuery";
import { ExpandedTransaction } from "@/lib/types";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { TransactionCard } from "./TransactionCard";
import { TransactionGroupDisplay } from "./TransactionGroupDisplay";
import { TransactionCardLoader } from "./TransactionCardLoader";
import { Skeleton } from "@/components/ui/skeleton";
import NextIntersectionObserver from "@/components/ui/next-intersection-observer";
import { useQueryParams } from "@/lib/hooks/useQueryParams";
import { TransactionsTable } from "./TransactionsTable";
import { cn } from "@/lib/utils";

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
  const isLocked = useRef(false);
  const { queryParams } = useQueryParams();
  const viewMode = queryParams["view"] || "cards";

  // Enable fetching after delay when not loading
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
          isLocked.current = false;
        }, 100);
      });
    }
  }, [hasNextPage, canFetchNext, isLoading, isFetchingNextPage, fetchNextPage]);

  // Group transactions by date in a single pass
  const groupedTransactions = useMemo(() => {
    const items = data?.pages?.flatMap((page) => page.items);
    if (!items?.length) return [];

    const groups: Record<string, ExpandedTransaction[]> = {};
    for (const txn of items) {
      const d = new Date(txn.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(txn);
    }
    return Object.entries(groups);
  }, [data?.pages]);

  const isTableView = viewMode === "table";
  const showLoader = isLoading || isFetchingNextPage || hasNextPage;

  return (
    <div
      id="transactions-container"
      className={cn(
        "grid pb-20 md:pb-0 w-full rounded-lg grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 min-h-[150px] px-[2px] py-1 z-0",
        { "pb-0": isTableView },
      )}
      ref={parent}
    >
      {isRefetching ? (
        <output className="col-span-full">
          <Skeleton
            aria-live="polite"
            className="w-full bg-slate-800 p-4 text-center text-slate-400 italic font-semibold"
          >
            Updating Transactions…
          </Skeleton>
        </output>
      ) : null}

      {!isLoading && groupedTransactions.length === 0 ? (
        <div className="w-full flex items-center justify-center col-span-full h-[300px] flex-col text-center gap-3">
          <h4 className="text-2xl text-slate-400">No transactions yet!</h4>
          <p className="text-slate-500">
            {`Click the "Add" button (or plus on mobile) to add banks and
            transactions to get started.`}
          </p>
        </div>
      ) : null}

      {isTableView ? (
        <div className="col-span-full">
          <TransactionsTable
            transactions={groupedTransactions.flatMap(([, txns]) => txns)}
            handleFetchNextPage={handleFetchNextPage}
            loaderRow={
              showLoader ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center bg-slate-900/80">
                    <NextIntersectionObserver
                      classes="w-full"
                      rootmargin="0px"
                      thresholdValue={[0, 1]}
                    >
                      {(boundary) => {
                        if (boundary === "topIn" || boundary === "bottomIn")
                          handleFetchNextPage();
                        return (
                          <div className="flex justify-center items-center w-full">
                            <div className="h-6 w-6 animate-spin rounded-full border-4 border-orange-400 border-t-transparent" />
                            <span className="ml-3 font-semibold">Loading…</span>
                          </div>
                        );
                      }}
                    </NextIntersectionObserver>
                  </td>
                </tr>
              ) : null
            }
          />
        </div>
      ) : (
        groupedTransactions.map(([dateKey, transactions]) =>
          transactions.length > 1 ? (
            <TransactionGroupDisplay
              key={dateKey}
              transactions={transactions}
            />
          ) : (
            <div
              key={transactions[0].id}
              className="overflow-visible"
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "auto 120px",
                contain: "layout style",
              }}
            >
              <TransactionCard {...transactions[0]} />
            </div>
          ),
        )
      )}

      {!isTableView ? (
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
      ) : null}

      {showLoader && !isTableView
        ? [0, 1, 2, 3].map((n) => <TransactionCardLoader key={`loader-${n}`} />)
        : null}
    </div>
  );
};
