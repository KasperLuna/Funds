import { useInfiniteQuery } from "@tanstack/react-query";
import { paginatedFetchTransactions } from "../pocketbase/queries";
import { pb } from "../pocketbase/pocketbase";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export const useTransactionsQuery = ({ bankName }: { bankName?: string }) => {
  const searchParams = useSearchParams();
  const query = searchParams.get("query");

  const {
    data,
    error,
    isLoading,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["transactions", `${bankName || "DEFAULT"}`, query],
    queryFn: ({ pageParam = 1 }) =>
      paginatedFetchTransactions({ pageParam, bankName, query }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.page < lastPage.totalPages
        ? lastPage.page + 1
        : undefined;
    },
  });

  useEffect(() => {
    pb.collection("transactions").subscribe("*", () => refetch());
    return () => {
      pb.collection("transactions").unsubscribe("*");
    };
  }, [bankName, fetchNextPage, refetch]);

  return {
    data,
    error,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
};
